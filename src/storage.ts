import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

export const OPENAI_API_KEY_STORAGE_KEY = 'lingualens.openai_api_key'
export const SESSION_LOG_STORAGE_KEY = 'lingualens.session_log'
export const BACKGROUND_STATE_STORAGE_KEY = 'lingualens.background_state'

export interface SessionLogEntry {
  type: 'HINT' | 'WORD' | 'RECAP' | 'NONE'
  text: string
  createdAt: number
}

export interface PersistedHintChoice {
  english: string
  label: string
}

export interface PersistedCoachCard {
  type: 'HINT' | 'WORD' | 'RECAP' | 'NONE'
  text: string
  ttl_ms: number
  choices: PersistedHintChoice[]
  continuation?: boolean
  attributed_roles?: Array<'learner' | 'partner'>
}

export interface PersistedTranscriptEntry {
  id: string
  text: string
  startedAt: string
  endedAt: string
  gapBeforeMs: number
  attributedRole?: 'learner' | 'partner'
  createdAt: number
  timestamp?: string
  role?: 'speaker' | 'partner'
}

export interface BackgroundSessionState {
  mode: 'setup' | 'live' | 'demo'
  transcriptLog: PersistedTranscriptEntry[]
  learningLog: SessionLogEntry[]
  activeCard: PersistedCoachCard
  savedAt: number
}

export async function loadStoredApiKey(bridge: EvenAppBridge): Promise<string | null> {
  try {
    const value = await bridge.getLocalStorage(OPENAI_API_KEY_STORAGE_KEY)
    return value?.trim() ? value.trim() : null
  } catch {
    return null
  }
}

export async function saveStoredApiKey(bridge: EvenAppBridge, apiKey: string): Promise<boolean> {
  try {
    return await bridge.setLocalStorage(OPENAI_API_KEY_STORAGE_KEY, apiKey)
  } catch {
    return false
  }
}

export async function loadSessionLog(bridge: EvenAppBridge): Promise<SessionLogEntry[]> {
  try {
    const raw = await bridge.getLocalStorage(SESSION_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SessionLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveSessionLog(bridge: EvenAppBridge, entries: SessionLogEntry[]): Promise<void> {
  try {
    const filtered = entries
      .filter(entry => typeof entry.text === 'string' && entry.text.trim().length > 0)
      .slice(0, 6)
    await bridge.setLocalStorage(SESSION_LOG_STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // ignore
  }
}

export async function loadBackgroundState(bridge: EvenAppBridge): Promise<BackgroundSessionState | null> {
  try {
    const raw = await bridge.getLocalStorage(BACKGROUND_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BackgroundSessionState
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.transcriptLog) || !Array.isArray(parsed.learningLog)) return null
    if (!parsed.activeCard || typeof parsed.activeCard !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export async function saveBackgroundState(
  bridge: EvenAppBridge,
  state: BackgroundSessionState | null,
): Promise<void> {
  try {
    await bridge.setLocalStorage(BACKGROUND_STATE_STORAGE_KEY, state ? JSON.stringify(state) : '')
  } catch {
    // ignore
  }
}
