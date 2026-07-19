export interface DemoItem {
  atMs: number
  role: 'speaker' | 'partner'
  text: string
}

export const DEMO_SCRIPT: DemoItem[] = [
  { atMs: 800, role: 'partner', text: 'We need to iterate on the prototype before the stakeholder review.' },
  { atMs: 4200, role: 'speaker', text: 'Uh, I want say... we need more time before the review.' },
  { atMs: 8200, role: 'partner', text: 'Is Friday a feasible deadline for your team?' },
  { atMs: 12200, role: 'speaker', text: 'Maybe... ano... Friday is too tight for us.' },
  { atMs: 16800, role: 'partner', text: 'Okay. Which part is blocked right now?' },
  { atMs: 20800, role: 'speaker', text: 'The login flow. I am not sure how to explain the risk.' },
  { atMs: 34800, role: 'partner', text: 'Take your time.' },
  { atMs: 39400, role: 'speaker', text: 'Thanks. We need one more round of user testing.' },
  { atMs: 44800, role: 'partner', text: 'That makes sense. Let us update the plan after the review.' },
]

export const DEMO_LOOP_GAP_MS = 2400
export const DEMO_SCRIPT_DURATION_MS = DEMO_SCRIPT[DEMO_SCRIPT.length - 1]!.atMs
export const DEMO_LOOP_DURATION_MS = DEMO_SCRIPT_DURATION_MS + DEMO_LOOP_GAP_MS

export function getDemoItemsDueSince(
  script: readonly DemoItem[],
  elapsedMs: number,
  injectedCount: number,
): DemoItem[] {
  if (script.length === 0 || injectedCount >= script.length) return []
  const due: DemoItem[] = []
  for (let index = injectedCount; index < script.length; index += 1) {
    const item = script[index]!
    if (elapsedMs < item.atMs) break
    due.push(item)
  }
  return due
}
