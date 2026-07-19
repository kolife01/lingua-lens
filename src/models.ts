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
    // TODO: verify at platform pricing page
    transcriptionUsdPerSecond: 0.00006,
  },
}
