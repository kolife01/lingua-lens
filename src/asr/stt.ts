import { ASR_MODEL } from '../models'
import type { TranscriptionUsageReport } from '../budget'

export interface BatchTranscriberOptions {
  apiKey: string
  onTranscript: (result: {
    text: string
    model: string
    audioSeconds: number
    rms: number
    bufferedMs: number
    latencyMs: number
  }) => void | Promise<void>
  onUsage?: (report: TranscriptionUsageReport) => void | Promise<void>
  isRequestAllowed?: () => boolean | Promise<boolean>
  onRequestBlocked?: () => void | Promise<void>
  onError?: (err: unknown) => void
  onVadDebug?: (info: { rms: number; threshold: number; forwarded: boolean; bufferedMs: number }) => void
  rmsThreshold?: number
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
const DEFAULT_RMS_THRESHOLD = 0.012

export function createBatchTranscriber(options: BatchTranscriberOptions): BatchTranscriber {
  const chunks: Uint8Array[] = []
  let closed = false
  const rmsThreshold = options.rmsThreshold ?? DEFAULT_RMS_THRESHOLD
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
    const rms = computeNormalizedRms(pcm)
    const bufferedMs = Math.round((pcm.byteLength / (CHANNEL_COUNT * (BITS_PER_SAMPLE / 8) * SAMPLE_RATE)) * 1000)
    if (rms < rmsThreshold) {
      options.onVadDebug?.({
        rms,
        threshold: rmsThreshold,
        forwarded: false,
        bufferedMs,
      })
      return
    }
    options.onVadDebug?.({
      rms,
      threshold: rmsThreshold,
      forwarded: true,
      bufferedMs,
    })
    const wav = pcmToWav(pcm)
    inFlight = inFlight.then(async () => {
      try {
        const allowed = (await options.isRequestAllowed?.()) ?? true
        if (!allowed) {
          await options.onRequestBlocked?.()
          return
        }
        const audioSeconds = pcm.byteLength / (CHANNEL_COUNT * (BITS_PER_SAMPLE / 8) * SAMPLE_RATE)
        const startedAt = performance.now()
        const text = await transcribeWav(options.apiKey, wav)
        const latencyMs = Math.round(performance.now() - startedAt)
        await options.onUsage?.({
          model: ASR_MODEL,
          audioSeconds,
        })
        const normalized = text.replace(/\s+/g, ' ').trim()
        if (!normalized || normalized === lastText) return
        lastText = normalized
        await options.onTranscript({
          text: normalized,
          model: ASR_MODEL,
          audioSeconds,
          rms,
          bufferedMs,
          latencyMs,
        })
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

function computeNormalizedRms(pcmBytes: Uint8Array): number {
  if (pcmBytes.byteLength < 2) return 0
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength)
  let sum = 0
  let sampleCount = 0
  for (let offset = 0; offset + 1 < pcmBytes.byteLength; offset += 2) {
    const sample = view.getInt16(offset, true) / 32768
    sum += sample * sample
    sampleCount += 1
  }
  if (sampleCount === 0) return 0
  return Math.sqrt(sum / sampleCount)
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
