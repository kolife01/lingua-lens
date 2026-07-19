import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { DAILY_BUDGET_USD, PRICING } from './models'

const STORAGE_PREFIX = 'lingualens.daily_budget'

export interface BudgetSnapshot {
  dateKey: string
  spentUsd: number
  limitUsd: number
  remainingUsd: number
  ratioUsed: number
  reached: boolean
}

export interface ResponseUsageReport {
  model: string
  inputTokens: number
  outputTokens: number
}

export interface TranscriptionUsageReport {
  model: string
  audioSeconds: number
}

interface PersistedBudgetState {
  spentUsd: number
  updatedAt: number
}

export interface DailyBudgetTracker {
  getSnapshot(): Promise<BudgetSnapshot>
  isLimitReached(): Promise<boolean>
  recordResponseUsage(report: ResponseUsageReport): Promise<BudgetSnapshot>
  recordTranscriptionUsage(report: TranscriptionUsageReport): Promise<BudgetSnapshot>
}

export function createDailyBudgetTracker(
  bridge: EvenAppBridge,
  limitUsd: number = DAILY_BUDGET_USD,
): DailyBudgetTracker {
  let currentDateKey = ''
  let currentSpentUsd = 0

  async function getSnapshot(): Promise<BudgetSnapshot> {
    await syncState()
    return buildSnapshot(currentDateKey, currentSpentUsd, limitUsd)
  }

  async function isLimitReached(): Promise<boolean> {
    const snapshot = await getSnapshot()
    return snapshot.reached
  }

  async function recordResponseUsage(report: ResponseUsageReport): Promise<BudgetSnapshot> {
    const pricing = PRICING[report.model]
    if (!pricing) return getSnapshot()

    const estimatedUsd =
      ((pricing.inputUsdPerMillionTokens ?? 0) * Math.max(0, report.inputTokens)) / 1_000_000 +
      ((pricing.outputUsdPerMillionTokens ?? 0) * Math.max(0, report.outputTokens)) / 1_000_000

    return recordUsd(estimatedUsd)
  }

  async function recordTranscriptionUsage(report: TranscriptionUsageReport): Promise<BudgetSnapshot> {
    const pricing = PRICING[report.model]
    if (!pricing?.transcriptionUsdPerSecond) return getSnapshot()
    return recordUsd(pricing.transcriptionUsdPerSecond * Math.max(0, report.audioSeconds))
  }

  async function recordUsd(amountUsd: number): Promise<BudgetSnapshot> {
    await syncState()
    if (!(amountUsd > 0)) return buildSnapshot(currentDateKey, currentSpentUsd, limitUsd)
    currentSpentUsd = roundUsd(currentSpentUsd + amountUsd)
    await persistState(currentDateKey, currentSpentUsd)
    return buildSnapshot(currentDateKey, currentSpentUsd, limitUsd)
  }

  async function syncState(): Promise<void> {
    const today = toDateKey(new Date())
    if (today === currentDateKey) return

    const persisted = await loadState(today)
    currentDateKey = today
    currentSpentUsd = persisted?.spentUsd ?? 0
  }

  async function loadState(dateKey: string): Promise<PersistedBudgetState | null> {
    try {
      const raw = await bridge.getLocalStorage(storageKey(dateKey))
      if (!raw) return null
      const parsed = JSON.parse(raw) as PersistedBudgetState
      if (!parsed || typeof parsed.spentUsd !== 'number') return null
      return {
        spentUsd: roundUsd(parsed.spentUsd),
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      }
    } catch {
      return null
    }
  }

  async function persistState(dateKey: string, spentUsd: number): Promise<void> {
    try {
      await bridge.setLocalStorage(
        storageKey(dateKey),
        JSON.stringify({
          spentUsd: roundUsd(spentUsd),
          updatedAt: Date.now(),
        } satisfies PersistedBudgetState),
      )
    } catch {
      // ignore
    }
  }

  return {
    getSnapshot,
    isLimitReached,
    recordResponseUsage,
    recordTranscriptionUsage,
  }
}

function buildSnapshot(dateKey: string, spentUsd: number, limitUsd: number): BudgetSnapshot {
  const normalizedSpent = roundUsd(spentUsd)
  const remainingUsd = Math.max(0, roundUsd(limitUsd - normalizedSpent))
  return {
    dateKey,
    spentUsd: normalizedSpent,
    limitUsd,
    remainingUsd,
    ratioUsed: limitUsd > 0 ? Math.min(1, normalizedSpent / limitUsd) : 1,
    reached: normalizedSpent >= limitUsd,
  }
}

function storageKey(dateKey: string): string {
  return `${STORAGE_PREFIX}.${dateKey}`
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
