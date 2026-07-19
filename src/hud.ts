import { TextContainerUpgrade, ImageRawDataUpdate, type EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderHeroPng } from './hero'

interface HudRendererOptions {
  bridge: EvenAppBridge
  ids: {
    status: number
    body: number
    aux: number
    hero: number
  }
}

const TEXT_MIN_INTERVAL_MS = 200
const IMAGE_MIN_INTERVAL_MS = 1000

export function createHudRenderer(options: HudRendererOptions) {
  const { bridge, ids } = options
  let lastTextAt = 0
  let lastImageAt = 0
  let pendingText: number | null = null
  let pendingImage: number | null = null
  let imageUpdateInFlight = false
  let lastTexts = {
    status: '',
    body: '',
    aux: '',
  }
  let lastHero = ''
  let displayedHero = ''

  async function renderIdle(status: string, body: string, aux: string, heroLabel: string): Promise<void> {
    queueText('status', status)
    queueText('body', body)
    queueText('aux', aux)
    queueImage(heroLabel)
  }

  async function renderQuiet(status: string): Promise<void> {
    queueText('status', status)
    queueText('body', '')
    queueText('aux', '')
    queueImage('CLEAR')
  }

  async function renderCard(type: string, body: string, aux: string): Promise<void> {
    queueText('status', type)
    queueText('body', body)
    queueText('aux', aux)
    queueImage(type)
  }

  function queueText(kind: keyof typeof lastTexts, value: string): void {
    lastTexts[kind] = value
    const waitMs = Math.max(0, TEXT_MIN_INTERVAL_MS - (Date.now() - lastTextAt))
    if (pendingText !== null) return
    pendingText = window.setTimeout(async () => {
      pendingText = null
      lastTextAt = Date.now()
      await Promise.all([
        bridge.textContainerUpgrade(
          new TextContainerUpgrade({
            containerID: ids.status,
            containerName: 'status',
            content: lastTexts.status,
          }),
        ),
        bridge.textContainerUpgrade(
          new TextContainerUpgrade({
            containerID: ids.body,
            containerName: 'body',
            content: lastTexts.body,
          }),
        ),
        bridge.textContainerUpgrade(
          new TextContainerUpgrade({
            containerID: ids.aux,
            containerName: 'aux',
            content: lastTexts.aux,
          }),
        ),
      ])
    }, waitMs)
  }

  function queueImage(label: string): void {
    lastHero = label
    scheduleImageFlush()
  }

  function scheduleImageFlush(): void {
    if (pendingImage !== null || imageUpdateInFlight || lastHero === displayedHero) return
    const waitMs = Math.max(0, IMAGE_MIN_INTERVAL_MS - (Date.now() - lastImageAt))
    pendingImage = window.setTimeout(() => {
      pendingImage = null
      void flushImage()
    }, waitMs)
  }

  async function flushImage(): Promise<void> {
    if (imageUpdateInFlight || lastHero === displayedHero) return
    imageUpdateInFlight = true
    const nextHero = lastHero
    lastImageAt = Date.now()
    try {
      const data = await renderHeroPng(nextHero)
      await bridge.updateImageRawData(
        new ImageRawDataUpdate({
          containerID: ids.hero,
          containerName: 'hero',
          imageData: data,
        }),
      )
      displayedHero = nextHero
    } finally {
      imageUpdateInFlight = false
      if (lastHero !== displayedHero) scheduleImageFlush()
    }
  }

  return {
    renderIdle,
    renderQuiet,
    renderCard,
  }
}
