export interface DemoItem {
  atMs: number
  role: 'speaker' | 'partner'
  text: string
}

const SCRIPT: DemoItem[] = [
  { atMs: 600, role: 'partner', text: 'We need to iterate on the prototype before the stakeholder review.' },
  { atMs: 2600, role: 'speaker', text: 'Uh, i want say… we need more time.' },
  { atMs: 5200, role: 'partner', text: 'Is Friday a feasible deadline for your team?' },
  { atMs: 8000, role: 'speaker', text: 'Okay, thanks. That sounds good.' },
]

export function createDemoScript() {
  const timers: number[] = []

  return {
    start(onItem: (item: DemoItem) => void | Promise<void>): void {
      for (const item of SCRIPT) {
        const timer = window.setTimeout(() => {
          void onItem(item)
        }, item.atMs)
        timers.push(timer)
      }
    },
    stop(): void {
      for (const timer of timers) window.clearTimeout(timer)
    },
  }
}
