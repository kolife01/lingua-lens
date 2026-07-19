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
        minimum: 0,
        maximum: 5000,
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
          model: 'gpt-5.6',
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text:
                    'You are LinguaLens, a restrained English conversation coach for smart glasses. Return JSON only. Favor NONE unless a short intervention is clearly useful. HINT gives only the first two English words plus ellipsis, not full answers. WORD gives one difficult word plus a simple paraphrase of at most 3 words. RECAP appears only at a pause and only for one missed expression. Keep text readable within 2 seconds.',
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

      const data = (await response.json()) as {
        output_text?: string
        output?: Array<{
          content?: Array<{
            type?: string
            text?: string
          }>
        }>
      }

      const raw =
        data.output_text ??
        data.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text ??
        ''

      const parsed = JSON.parse(raw) as CoachDecision
      return sanitizeDecision(parsed)
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
          ttl_ms: 2200,
        }
      }
      if (last.role === 'partner' && /(deadline|iterate|prototype|stakeholder|feasible)/.test(text)) {
        return {
          type: 'WORD',
          text: pickWord(last.text),
          ttl_ms: 2400,
        }
      }
      if (
        context.transcriptWindow.length >= 4 &&
        last.role === 'speaker' &&
        /(thanks|okay|got it|sounds good)/.test(text)
      ) {
        return {
          type: 'RECAP',
          text: 'Try: I am still thinking…',
          ttl_ms: 2600,
        }
      }
      return NONE
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
  const ttl_ms = Number.isFinite(value.ttl_ms) ? Math.max(0, Math.min(5000, value.ttl_ms)) : 0
  if (value.type === 'NONE') return NONE
  return {
    type: value.type,
    text,
    ttl_ms: ttl_ms || 2200,
  }
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
