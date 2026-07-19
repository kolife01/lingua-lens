import { ASR_MODEL } from '../models'

export interface BatchTranscriberOptions {
  apiKey: string
  onTranscript: (text: string) => void | Promise<void>
  onError?: (err: unknown) => void
}

export interface BatchTranscriber {
  sendPcm(chunk: Uint8Array): void
  close(): Promise<void>
}

const SAMPLE_RATE = 16000
const CHANNEL_COUNT = 1
const BITS_PER_SAMPLE = 16
const FLUSH_INTERVAL_MS = 3200
const MIN_BUFFER_BYTES = SAMPLE_RATE * 2

export function createBatchTranscriber(options: BatchTranscriberOptions): BatchTranscriber {
  const chunks: Uint8Array[] = []
  let closed = false
  let timer = window.setInterval(() => {
    void flush(false)
  }, FLUSH_INTERVAL_MS)
  let inFlight = Promise.resolve()
  let lastText = ''

  function sendPcm(chunk: Uint8Array): void {
    if (closed || chunk.byteLength === 0) return
    chunks.push(new Uint8Array(chunk))
  }

  async function close(): Promise<void> {
    closed = true
    window.clearInterval(timer)
    await flush(true)
    await inFlight
  }

  async function flush(force: boolean): Promise<void> {
    const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    if ((!force && size < MIN_BUFFER_BYTES) || size === 0) return
    const pcm = mergeChunks(chunks.splice(0, chunks.length))
    const wav = pcmToWav(pcm)
    inFlight = inFlight.then(async () => {
      try {
        const text = await transcribeWav(options.apiKey, wav)
        const normalized = text.replace(/\s+/g, ' ').trim()
        if (!normalized || normalized === lastText) return
        lastText = normalized
        await options.onTranscript(normalized)
      } catch (err) {
        options.onError?.(err)
      }
    })
    await inFlight
  }

  return {
    sendPcm,
    close,
  }
}

async function transcribeWav(apiKey: string, wavBytes: Uint8Array): Promise<string> {
  const form = new FormData()
  form.append('model', ASR_MODEL)
  const wavBuffer = new ArrayBuffer(wavBytes.byteLength)
  new Uint8Array(wavBuffer).set(wavBytes)
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'speech.wav')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  })

  if (!response.ok) {
    throw new Error(`OpenAI transcription failed: ${response.status}`)
  }

  const data = (await response.json()) as { text?: string }
  return data.text ?? ''
}

function mergeChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

function pcmToWav(pcmBytes: Uint8Array): Uint8Array {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const byteRate = SAMPLE_RATE * CHANNEL_COUNT * (BITS_PER_SAMPLE / 8)
  const blockAlign = CHANNEL_COUNT * (BITS_PER_SAMPLE / 8)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcmBytes.byteLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, CHANNEL_COUNT, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BITS_PER_SAMPLE, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcmBytes.byteLength, true)

  const wav = new Uint8Array(44 + pcmBytes.byteLength)
  wav.set(new Uint8Array(header), 0)
  wav.set(pcmBytes, 44)
  return wav
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}
