import { INTERVENTION_MODEL, RECAP_MODEL } from './models'

export type CoachType = 'HINT' | 'WORD' | 'RECAP' | 'NONE'

export interface CoachDecision {
  type: CoachType
  text: string
  ttl_ms: number
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

const COACH_SCHEMA = {
  name: 'lingualens_coach',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'text', 'ttl_ms'],
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

export function createCoachEngine(apiKey: string): CoachEngine {
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
                    'You are LinguaLens, a restrained English conversation coach for smart glasses. Return JSON only. Favor NONE unless a short intervention is clearly useful. HINT gives only the first two English words plus ellipsis, not full answers. WORD gives one difficult word plus a simple paraphrase of at most 3 words. Never emit RECAP here. Keep text readable within 2 seconds.',
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

      const parsed = JSON.parse(await readOutputText(response)) as CoachDecision
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

      const parsed = JSON.parse(await readOutputText(response)) as { text: string; ttl_ms: number }
      return sanitizeDecision({
        type: 'RECAP',
        text: parsed.text,
        ttl_ms: parsed.ttl_ms,
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
          text: 'You could…',
          ttl_ms: 3500,
        }
      }
      if (last.role === 'partner' && /(deadline|iterate|prototype|stakeholder|feasible)/.test(text)) {
        return {
          type: 'WORD',
          text: pickWord(last.text),
          ttl_ms: 4000,
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
      }
    },
  }
}

const NONE: CoachDecision = {
  type: 'NONE',
  text: '',
  ttl_ms: 0,
}

function sanitizeDecision(value: CoachDecision): CoachDecision {
  if (!value || !['HINT', 'WORD', 'RECAP', 'NONE'].includes(value.type)) return NONE
  const text = typeof value.text === 'string' ? value.text.trim().slice(0, 80) : ''
  const ttl_ms = Number.isFinite(value.ttl_ms) ? Math.max(3500, Math.min(6000, value.ttl_ms)) : 0
  if (value.type === 'NONE' || !text) return NONE
  return {
    type: value.type,
    text,
    ttl_ms: ttl_ms || 3500,
  }
}

async function readOutputText(response: Response): Promise<string> {
  const data = (await response.json()) as {
    output_text?: string
    output?: Array<{
      content?: Array<{
        type?: string
        text?: string
      }>
    }>
  }

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
