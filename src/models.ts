export const INTERVENTION_MODEL = 'gpt-5.6-luna'
export const RECAP_MODEL = 'gpt-5.6'
export const ASR_MODEL = 'gpt-4o-mini-transcribe'
export const DAILY_BUDGET_USD = 1

export interface ModelPricing {
  inputUsdPerMillionTokens?: number
  outputUsdPerMillionTokens?: number
  transcriptionUsdPerSecond?: number
}

export const PRICING: Record<string, ModelPricing> = {
  'gpt-5.6-luna': {
    inputUsdPerMillionTokens: 1,
    outputUsdPerMillionTokens: 6,
  },
  'gpt-5.6': {
    inputUsdPerMillionTokens: 5,
    outputUsdPerMillionTokens: 30,
  },
  'gpt-4o-mini-transcribe': {
    // Official model pricing confirms $1.25 / 1M input audio tokens:
    // https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe
    // This app budgets uploaded audio by second because the transcription endpoint
    // does not expose audio-token usage in this path; keep the existing per-second
    // estimate as a conservative fallback until token-accurate metering is wired.
    transcriptionUsdPerSecond: 0.00006,
  },
}
