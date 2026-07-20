import { INTERVENTION_MODEL, RECAP_MODEL } from './models'
import type { ResponseUsageReport } from './budget'

export type CoachType = 'HINT' | 'WORD' | 'RECAP' | 'NONE'
export type AttributedRole = 'learner' | 'partner'

export interface HintChoice {
  english: string
  label: string
}

export interface CoachDecision {
  type: CoachType
  text: string
  ttl_ms: number
  choices: HintChoice[]
  continuation: boolean
  attributed_roles: AttributedRole[]
}

export interface TranscriptUtterance {
  text: string
  startedAt: string
  endedAt: string
  gapBeforeMs: number
}

export interface CoachContext {
  mode: 'setup' | 'live' | 'demo'
  transcriptWindow: TranscriptUtterance[]
  previousCard: CoachDecision
  trigger: 'stall' | 'explicit_tap'
  triggerReason: string
}

export interface CoachEngine {
  decide(context: CoachContext): Promise<CoachDecision>
  createRecap(transcriptWindow: TranscriptUtterance[]): Promise<CoachDecision>
}

export interface CoachEngineOptions {
  apiKey: string
  onUsage?: (report: ResponseUsageReport & { kind: 'decision' | 'recap' }) => void | Promise<void>
}

const COACH_SCHEMA = {
  name: 'lingualens_coach',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'text', 'ttl_ms', 'choices', 'continuation', 'attributed_roles'],
    properties: {
      type: {
        type: 'string',
        enum: ['HINT', 'WORD', 'RECAP', 'NONE'],
      },
      text: {
        type: 'string',
      },
      ttl_ms: {
        type: 'integer',
        minimum: 3500,
        maximum: 6000,
      },
      continuation: {
        type: 'boolean',
      },
      attributed_roles: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['learner', 'partner'],
        },
      },
      choices: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['english', 'label'],
          properties: {
            english: {
              type: 'string',
            },
            label: {
              type: 'string',
            },
          },
        },
      },
    },
  },
} as const

const RECAP_SCHEMA = {
  name: 'lingualens_recap',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['text', 'ttl_ms'],
    properties: {
      text: {
        type: 'string',
      },
      ttl_ms: {
        type: 'integer',
        minimum: 3500,
        maximum: 6000,
      },
    },
  },
} as const

export function createCoachEngine(options: CoachEngineOptions): CoachEngine {
  const { apiKey, onUsage } = options

  return {
    async decide(context: CoachContext): Promise<CoachDecision> {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: INTERVENTION_MODEL,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text:
                    'You are LinguaLens, a restrained English conversation coach for smart glasses. Return JSON only. Favor NONE unless a short intervention is clearly useful. Never emit RECAP here. First attribute each utterance in transcriptWindow to learner or partner and return that full alignment in attributed_roles with exactly one role per utterance in order. Do not assume the app knows the speaker. Infer from the dialogue. If the conversation partner is an AI like GPT-Live or a fluent speaker, their turns tend to be longer and more fluent; learner turns are more likely to contain hesitation, Japanese fragments, shorter broken phrases, or self-repair. If the learner says any Japanese, that is the strongest clue to intent and must override looser contextual guessing: convert that Japanese intent directly into sayable English. If the learner is already mid-sentence, set continuation=true and make all 3 choices continue naturally from what the learner just said, because the learner will speak them immediately after the existing fragment. Only when the learner is not mid-sentence may you produce standalone sentences. HINT must always return exactly 3 choices in choices[]. Each choice needs english and label. english must be short spoken English the learner can say immediately, at most 10 words, with no verbose prefacing. label must be a short Japanese meaning label, 3 to 8 characters. The 3 choices must differ in intent, not just wording, and should be ordered most likely first. WORD should prefer a short example sentence over a paraphrase when that is more useful. WORD and NONE must use choices:[]. Keep output readable within 2 seconds.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify({
                    mode: context.mode,
                    trigger: context.trigger,
                    triggerReason: context.triggerReason,
                    previousCard: context.previousCard,
                    transcriptWindow: context.transcriptWindow,
                  }),
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: COACH_SCHEMA.name,
              strict: COACH_SCHEMA.strict,
              schema: COACH_SCHEMA.schema,
            },
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI coach failed: ${response.status}`)
      }

      const payload = await readResponsePayload(response)
      await onUsage?.({
        kind: 'decision',
        model: INTERVENTION_MODEL,
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
      })
      const parsed = JSON.parse(readOutputText(payload)) as CoachDecision
      const decision = sanitizeDecision(parsed, context.transcriptWindow.length)
      return decision.type === 'RECAP' ? NONE : decision
    },

    async createRecap(transcriptWindow: TranscriptUtterance[]): Promise<CoachDecision> {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: RECAP_MODEL,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text:
                    'You create one recap card for an English learner after a pause in conversation. Return JSON only. Choose one expression the learner likely wanted but could not say. Keep it short enough for a smart-glasses HUD and do not include explanation sentences.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify({
                    instruction: 'Return one missed expression from the recent exchange.',
                    transcriptWindow,
                  }),
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: RECAP_SCHEMA.name,
              strict: RECAP_SCHEMA.strict,
              schema: RECAP_SCHEMA.schema,
            },
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI recap failed: ${response.status}`)
      }

      const payload = await readResponsePayload(response)
      await onUsage?.({
        kind: 'recap',
        model: RECAP_MODEL,
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
      })
      const parsed = JSON.parse(readOutputText(payload)) as { text: string; ttl_ms: number }
      return sanitizeDecision({
        type: 'RECAP',
        text: parsed.text,
        ttl_ms: parsed.ttl_ms,
        choices: [],
        continuation: false,
        attributed_roles: [],
      })
    },
  }
}

export function createMockCoachEngine(): CoachEngine {
  return {
    async decide(context: CoachContext): Promise<CoachDecision> {
      const last = context.transcriptWindow[context.transcriptWindow.length - 1]
      if (!last) return NONE

      const text = last.text.toLowerCase()
      const attributed_roles = inferMockRoles(context.transcriptWindow)
      if (/(eto|ano|uh|um|えっと|あの|なんだっけ|how do you say|what's the word)/i.test(text)) {
        return {
          type: 'HINT',
          text: '',
          ttl_ms: 6000,
          continuation: /how to|want to|because|the login flow|i am not sure/i.test(text),
          attributed_roles,
          choices: [
            { english: 'Could we push the deadline?', label: '締切延長' },
            { english: 'Friday is too tight for us.', label: '金曜厳しい' },
            { english: 'Can we reduce the scope first?', label: '範囲縮小' },
          ],
        }
      }
      if (/(deadline|iterate|prototype|stakeholder|feasible|mitigate)/.test(text)) {
        return {
          type: 'WORD',
          text: pickWord(last.text),
          ttl_ms: 4000,
          continuation: false,
          attributed_roles,
          choices: [],
        }
      }
      return {
        ...NONE,
        attributed_roles,
      }
    },

    async createRecap(transcriptWindow: TranscriptUtterance[]): Promise<CoachDecision> {
      const recentLearner = [...transcriptWindow]
        .reverse()
        .find(entry => /(uh|um|i want say|not sure|how to say|えっと|あの)/i.test(entry.text))

      return {
        type: 'RECAP',
        text: recentLearner ? `Try: ${toMockRecap(recentLearner.text)}` : 'Try: Let me think for a second.',
        ttl_ms: 5000,
        continuation: false,
        attributed_roles: [],
        choices: [],
      }
    },
  }
}

const NONE: CoachDecision = {
  type: 'NONE',
  text: '',
  ttl_ms: 0,
  choices: [],
  continuation: false,
  attributed_roles: [],
}

function sanitizeDecision(value: CoachDecision, expectedUtterances: number = 0): CoachDecision {
  if (!value || !['HINT', 'WORD', 'RECAP', 'NONE'].includes(value.type)) return NONE
  const text = typeof value.text === 'string' ? value.text.trim().slice(0, 120) : ''
  const ttl_ms = Number.isFinite(value.ttl_ms) ? Math.max(3500, Math.min(6000, value.ttl_ms)) : 0
  const continuation = Boolean(value.continuation)
  const attributed_roles = normalizeAttributedRoles(value.attributed_roles, expectedUtterances)
  const choices = Array.isArray(value.choices) ? (value.choices.map(sanitizeChoice).filter(Boolean) as HintChoice[]) : []
  if (value.type === 'NONE') return { ...NONE, attributed_roles }
  if (value.type === 'HINT') {
    if (choices.length === 0) return { ...NONE, attributed_roles }
    return {
      type: 'HINT',
      text: '',
      ttl_ms: hintTtlMsFromChoices(choices.length),
      choices,
      continuation,
      attributed_roles,
    }
  }
  if (!text) return { ...NONE, attributed_roles }
  return {
    type: value.type,
    text,
    ttl_ms: ttl_ms || 3500,
    choices: [],
    continuation: false,
    attributed_roles,
  }
}

function normalizeAttributedRoles(value: AttributedRole[], expectedUtterances: number): AttributedRole[] {
  const normalized = Array.isArray(value)
    ? value.filter(role => role === 'learner' || role === 'partner')
    : []
  if (expectedUtterances <= 0) return normalized
  return normalized.slice(0, expectedUtterances)
}

function sanitizeChoice(value: unknown): HintChoice | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { english?: string; label?: string }
  const english = normalizeHintEnglish(record.english ?? '')
  const label = normalizeHintLabel(record.label ?? '')
  if (!english || !label) return null
  return { english, label }
}

function normalizeHintEnglish(text: string): string {
  const words = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 10)
  return words.join(' ').slice(0, 84)
}

function normalizeHintLabel(text: string): string {
  const compact = text.replace(/\s+/g, '').trim()
  const chars = Array.from(compact).slice(0, 8)
  if (chars.length < 3) return ''
  return chars.join('')
}

function hintTtlMsFromChoices(choiceCount: number): number {
  if (choiceCount >= 3) return 6000
  if (choiceCount === 2) return 5500
  return 5000
}

function inferMockRoles(transcriptWindow: TranscriptUtterance[]): AttributedRole[] {
  return transcriptWindow.map(entry => {
    if (/[ぁ-んァ-ヶ一-龠]/.test(entry.text) || /\b(uh|um|how do you say|what's the word|i|we|my|our)\b/i.test(entry.text)) {
      return 'learner'
    }
    return 'partner'
  })
}

interface ResponsesPayload {
  output_text?: string
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

async function readResponsePayload(response: Response): Promise<ResponsesPayload> {
  return (await response.json()) as ResponsesPayload
}

function readOutputText(data: ResponsesPayload): string {
  return (
    data.output_text ??
    data.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text ??
    ''
  )
}

function pickWord(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('stakeholder')) return 'The stakeholders need a clearer tradeoff.'
  if (lower.includes('prototype')) return 'The prototype is still rough.'
  if (lower.includes('iterate')) return 'We should iterate once more.'
  if (lower.includes('feasible')) return 'Is that timeline still feasible for you?'
  if (lower.includes('deadline')) return 'The deadline is tighter than expected.'
  if (lower.includes('mitigate')) return 'We need to mitigate that risk first.'
  return 'Can you say that in a simpler way?'
}

function toMockRecap(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('i want say')) return 'What I mean is...'
  if (lower.includes('not sure')) return 'I am not sure how to explain it yet.'
  return 'Let me think for a second.'
}
