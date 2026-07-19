import { INTERVENTION_MODEL, RECAP_MODEL } from './models'
import type { ResponseUsageReport } from './budget'

export type CoachType = 'HINT' | 'WORD' | 'RECAP' | 'NONE'

export interface HintChoice {
  english: string
  label: string
}

export interface CoachDecision {
  type: CoachType
  text: string
  ttl_ms: number
  choices: HintChoice[]
}

export interface TranscriptTurn {
  role: 'speaker' | 'partner'
  text: string
  timestamp: string
}

export interface CoachContext {
  mode: 'setup' | 'live' | 'demo'
  transcriptWindow: TranscriptTurn[]
  previousCard: CoachDecision
}

export interface CoachEngine {
  decide(context: CoachContext): Promise<CoachDecision>
  createRecap(transcriptWindow: TranscriptTurn[]): Promise<CoachDecision>
}

export interface CoachEngineOptions {
  apiKey: string
  onUsage?: (report: ResponseUsageReport) => void | Promise<void>
}

const COACH_SCHEMA = {
  name: 'lingualens_coach',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'text', 'ttl_ms', 'choices'],
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
                    'You are LinguaLens, a restrained English conversation coach for smart glasses. Return JSON only. Favor NONE unless a short intervention is clearly useful. Never emit RECAP here. HINT must return 1 to 3 choices in choices[]. Each choice needs english and label. english must be a complete line the speaker can say immediately, at most 6 words. label must be a short Japanese meaning label, 3 to 8 characters. Do not include numbering or separators inside english or label; the UI adds those. If context is very clear, return 1 choice. If ambiguous, return up to 3 choices. For HINT set text to an empty string or a very short summary. WORD gives one difficult word plus a simple paraphrase of at most 3 words in text and must use choices:[]. NONE must use choices:[]. Keep output readable within 2 seconds.',
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
        model: INTERVENTION_MODEL,
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
      })
      const parsed = JSON.parse(readOutputText(payload)) as CoachDecision
      const decision = sanitizeDecision(parsed)
      return decision.type === 'RECAP' ? NONE : decision
    },

    async createRecap(transcriptWindow: TranscriptTurn[]): Promise<CoachDecision> {
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
      if (last.role === 'speaker' && /(eto|ano|uh|um|なんだっけ|わたしは|i want say)/.test(text)) {
        return {
          type: 'HINT',
          text: '',
          ttl_ms: 5500,
          choices: [
            { english: 'Could we push the deadline?', label: '締切延長' },
            { english: 'Friday is too tight.', label: '金曜厳しい' },
          ],
        }
      }
      if (last.role === 'partner' && /(deadline|iterate|prototype|stakeholder|feasible)/.test(text)) {
        return {
          type: 'WORD',
          text: pickWord(last.text),
          ttl_ms: 4000,
          choices: [],
        }
      }
      return NONE
    },

    async createRecap(transcriptWindow: TranscriptTurn[]): Promise<CoachDecision> {
      const recentSpeaker = [...transcriptWindow]
        .reverse()
        .find(entry => entry.role === 'speaker' && /(uh|um|i want say|not sure|how to say)/i.test(entry.text))

      return {
        type: 'RECAP',
        text: recentSpeaker ? `Try: ${toMockRecap(recentSpeaker.text)}` : 'Try: Let me think for a second.',
        ttl_ms: 5000,
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
}

function sanitizeDecision(value: CoachDecision): CoachDecision {
  if (!value || !['HINT', 'WORD', 'RECAP', 'NONE'].includes(value.type)) return NONE
  const text = typeof value.text === 'string' ? value.text.trim().slice(0, 80) : ''
  const ttl_ms = Number.isFinite(value.ttl_ms) ? Math.max(3500, Math.min(6000, value.ttl_ms)) : 0
  const choices = Array.isArray(value.choices) ? value.choices.map(sanitizeChoice).filter(Boolean) as HintChoice[] : []
  if (value.type === 'NONE') return NONE
  if (value.type === 'HINT') {
    if (choices.length === 0) return NONE
    return {
      type: 'HINT',
      text: '',
      ttl_ms: hintTtlMsFromChoices(choices.length),
      choices,
    }
  }
  if (!text) return NONE
  return {
    type: value.type,
    text,
    ttl_ms: ttl_ms || 3500,
    choices: [],
  }
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
    .slice(0, 6)
  return words.join(' ').slice(0, 56)
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
  if (lower.includes('stakeholder')) return 'stakeholder = decision maker'
  if (lower.includes('prototype')) return 'prototype = first draft'
  if (lower.includes('iterate')) return 'iterate = try again'
  if (lower.includes('feasible')) return 'feasible = can do'
  if (lower.includes('deadline')) return 'deadline = due date'
  return 'key word = simpler phrase'
}

function toMockRecap(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('i want say')) return 'I mean to say…'
  if (lower.includes('not sure')) return 'I am not sure yet.'
  return 'Let me think for a second.'
}
