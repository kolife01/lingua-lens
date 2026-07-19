const WIDTH = 200
const HEIGHT = 100

const HERO_STYLE: Record<string, { bg: string; fg: string }> = {
  LIVE: { bg: '#0c2812', fg: '#b9ffba' },
  DEMO: { bg: '#1f2011', fg: '#f5ffaf' },
  SETUP: { bg: '#2a1a10', fg: '#ffd2ad' },
  HINT: { bg: '#10251d', fg: '#bfffd7' },
  WORD: { bg: '#122238', fg: '#c9e5ff' },
  RECAP: { bg: '#2d1523', fg: '#ffd2ea' },
  NONE: { bg: '#222222', fg: '#d5d5d5' },
}

export async function renderHeroPng(label: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return new Uint8Array()

  if (!label || label === 'CLEAR') {
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return new Uint8Array()
    return new Uint8Array(await blob.arrayBuffer())
  }

  const style = HERO_STYLE[label] ?? HERO_STYLE.NONE
  ctx.fillStyle = style.bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.strokeStyle = style.fg
  ctx.lineWidth = 4
  ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12)

  ctx.fillStyle = style.fg
  ctx.font = '700 34px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label.slice(0, 5), WIDTH / 2, HEIGHT / 2 - 8)

  ctx.font = '500 14px sans-serif'
  ctx.fillText('LinguaLens', WIDTH / 2, HEIGHT - 18)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return new Uint8Array()
  return new Uint8Array(await blob.arrayBuffer())
}
