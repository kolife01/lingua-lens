import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

export const OPENAI_API_KEY_STORAGE_KEY = 'lingualens.openai_api_key'
export const SESSION_LOG_STORAGE_KEY = 'lingualens.session_log'

export interface SessionLogEntry {
  type: 'HINT' | 'WORD' | 'RECAP' | 'NONE'
  text: string
  createdAt: number
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
    await bridge.setLocalStorage(SESSION_LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, 6)))
  } catch {
    // ignore
  }
}
