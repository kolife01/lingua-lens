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
  let lastTexts = {
    status: '',
    body: '',
    aux: '',
  }
  let lastHero = ''

  async function renderIdle(status: string, body: string, aux: string, heroLabel: string): Promise<void> {
    queueText('status', status)
    queueText('body', body)
    queueText('aux', aux)
    queueImage(heroLabel)
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
    const waitMs = Math.max(0, IMAGE_MIN_INTERVAL_MS - (Date.now() - lastImageAt))
    if (pendingImage !== null) return
    pendingImage = window.setTimeout(async () => {
      pendingImage = null
      lastImageAt = Date.now()
      const data = await renderHeroPng(lastHero)
      await bridge.updateImageRawData(
        new ImageRawDataUpdate({
          containerID: ids.hero,
          containerName: 'hero',
          imageData: data,
        }),
      )
    }, waitMs)
  }

  return {
    renderIdle,
    renderCard,
  }
}
