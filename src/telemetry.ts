import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

export type TelemetryRole = 'learner' | 'partner'
export type DecisionTrigger = 'stall' | 'explicit_tap' | 'recap'
export type StallReason =
  | 'filler'
  | 'fragment_silence'
  | 'question_silence'
  | 'japanese_mixed'
  | 'difficult_word'
  | 'explicit_tap'
export type StallSkipReason = 'no_trigger_match' | 'already_triggered' | 'budget_reached' | 'coach_unavailable'

export interface TelemetryEventMap {
  asr: {
    transcript: string
    utterance: {
      startedAt: string
      endedAt: string
      gapBeforeMs: number
    }
    rms: number
    asrLatencyMs: number
    audioSeconds: number
    bufferedMs: number
    model: string
    promptContext: string
    source: 'live'
  }
  stall: {
    action: 'triggered' | 'skipped'
    reason: StallReason | StallSkipReason
    utterance: {
      text: string
      startedAt: string
      endedAt: string
      gapBeforeMs: number
    } | null
    silenceMs?: number
    matchedText?: string
    matchedWord?: string
    source: 'live' | 'demo'
  }
  decision: {
    trigger: DecisionTrigger
    triggerReason?: string
    transcriptWindow: Array<{
      attributedRole?: TelemetryRole
      text: string
      startedAt: string
      endedAt: string
      gapBeforeMs: number
    }>
    model: string
    decision: {
      type: 'HINT' | 'WORD' | 'RECAP' | 'NONE'
      text: string
      choices: Array<{
        english: string
        label: string
      }>
      ttl_ms: number
      continuation: boolean
      attributed_roles: TelemetryRole[]
    }
    latencyMs: number
    estimatedCostUsd: number
    usage: {
      inputTokens: number
      outputTokens: number
    }
    source: 'live' | 'demo'
  }
  hud: {
    phase: 'render' | 'quiet'
    type: 'HINT' | 'WORD' | 'RECAP' | 'NONE'
    body: string
    aux: string
    displayedAt: string
    quietAt?: string
    source: string
    ttl_ms?: number
    reason?: string
  }
  recap_flow: {
    stage: 'silence_detected' | 'request_started' | 'request_completed' | 'request_failed'
    silenceMs: number
    lastTranscriptAt?: string
    triggerToken: number
    source: 'live' | 'demo'
    latencyMs?: number
    decisionText?: string
    error?: string
  }
  nod: {
    event: 'detected' | 'simulated' | 'extend_active_card' | 'restore_recap'
    activeCardType: 'HINT' | 'WORD' | 'RECAP' | 'NONE'
    ttl_ms?: number
    detectCount?: number
    source: 'live' | 'demo'
  }
}

export type TelemetryEventType = keyof TelemetryEventMap

export interface TelemetryEnvelope<TType extends TelemetryEventType = TelemetryEventType> {
  type: TType
  timestamp: string
  elapsedMs: number
  payload: TelemetryEventMap[TType]
}

export interface TelemetrySettings {
  enabled: boolean
  endpointUrl: string
}

export interface TelemetryStats {
  eventCount: number
  approximateBytes: number
}

export interface TelemetrySnapshot {
  settings: TelemetrySettings
  stats: TelemetryStats
}

export interface TelemetryLogger {
  log<TType extends TelemetryEventType>(type: TType, payload: TelemetryEventMap[TType]): void
}

export interface TelemetryController extends TelemetryLogger {
  getSnapshot(): TelemetrySnapshot
  subscribe(listener: (snapshot: TelemetrySnapshot) => void): () => void
  updateSettings(nextSettings: Partial<TelemetrySettings>): Promise<void>
  clear(): Promise<void>
  exportEvents(): TelemetryEnvelope[]
  flush(): Promise<void>
}

interface PersistedTelemetryState {
  settings: TelemetrySettings
  events: TelemetryEnvelope[]
}

const TELEMETRY_STORAGE_KEY = 'lingualens.telemetry_state'
const TELEMETRY_MAX_EVENTS = 200
const TELEMETRY_MAX_BYTES = 200 * 1024
const TELEMETRY_FLUSH_DEBOUNCE_MS = 2000
const DEFAULT_SETTINGS: TelemetrySettings = {
  enabled: true,
  endpointUrl: '',
}

export async function createTelemetryController(bridge: EvenAppBridge): Promise<TelemetryController> {
  const startedAt = Date.now()
  const encoder = new TextEncoder()
  const listeners = new Set<(snapshot: TelemetrySnapshot) => void>()
  let settings = { ...DEFAULT_SETTINGS }
  let events: TelemetryEnvelope[] = []
  let approximateBytes = 2
  let flushTimer: number | null = null
  let flushInFlight: Promise<void> | null = null
  let persistVersion = 0

  const raw = await bridge.getLocalStorage(TELEMETRY_STORAGE_KEY).catch(() => '')
  const persisted = parsePersistedState(raw)
  if (persisted) {
    settings = persisted.settings
    events = pruneEvents(persisted.events, encoder)
    approximateBytes = computeEventsBytes(events, encoder)
  }

  function getSnapshot(): TelemetrySnapshot {
    return {
      settings: { ...settings },
      stats: {
        eventCount: events.length,
        approximateBytes,
      },
    }
  }

  function emitSnapshot(): void {
    const snapshot = getSnapshot()
    for (const listener of listeners) listener(snapshot)
  }

  function scheduleFlush(): void {
    persistVersion += 1
    if (flushTimer !== null) return
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      void runFlush()
    }, TELEMETRY_FLUSH_DEBOUNCE_MS)
  }

  async function runFlush(): Promise<void> {
    if (flushInFlight) {
      await flushInFlight
      return
    }
    const targetVersion = persistVersion
    const state: PersistedTelemetryState = {
      settings: { ...settings },
      events: events.map(event => ({ ...event })),
    }
    flushInFlight = bridge
      .setLocalStorage(TELEMETRY_STORAGE_KEY, JSON.stringify(state))
      .catch(() => {})
      .then(() => {
        flushInFlight = null
      })
    await flushInFlight
    if (persistVersion !== targetVersion) {
      await runFlush()
    }
  }

  function queueEvent<TType extends TelemetryEventType>(type: TType, payload: TelemetryEventMap[TType]): void {
    const event: TelemetryEnvelope<TType> = {
      type,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      payload,
    }
    events = pruneEvents([...events, event], encoder)
    approximateBytes = computeEventsBytes(events, encoder)
    emitSnapshot()
    scheduleFlush()
    postToEndpoint(event)
  }

  function postToEndpoint(event: TelemetryEnvelope): void {
    const endpointUrl = settings.endpointUrl.trim()
    if (!endpointUrl) return
    try {
      void fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        keepalive: true,
        mode: 'cors',
      }).catch(() => {})
    } catch {
      // ignore outbound telemetry failures
    }
  }

  return {
    log(type, payload) {
      if (!settings.enabled) return
      try {
        queueEvent(type, payload)
      } catch {
        // ignore telemetry failures
      }
    },
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(getSnapshot())
      return () => {
        listeners.delete(listener)
      }
    },
    async updateSettings(nextSettings) {
      settings = {
        enabled: typeof nextSettings.enabled === 'boolean' ? nextSettings.enabled : settings.enabled,
        endpointUrl:
          typeof nextSettings.endpointUrl === 'string' ? normalizeEndpointUrl(nextSettings.endpointUrl) : settings.endpointUrl,
      }
      emitSnapshot()
      scheduleFlush()
    },
    async clear() {
      events = []
      approximateBytes = computeEventsBytes(events, encoder)
      emitSnapshot()
      scheduleFlush()
    },
    exportEvents() {
      return events.map(event => ({ ...event }))
    },
    async flush() {
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer)
        flushTimer = null
      }
      await runFlush()
    },
  }
}

function parsePersistedState(raw: string | null | undefined): PersistedTelemetryState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedTelemetryState>
    const persistedSettings = parsed.settings
    const persistedEvents = parsed.events
    return {
      settings: {
        enabled: persistedSettings?.enabled !== false,
        endpointUrl: normalizeEndpointUrl(persistedSettings?.endpointUrl ?? ''),
      },
      events: Array.isArray(persistedEvents) ? persistedEvents.filter(isTelemetryEnvelope) : [],
    }
  } catch {
    return null
  }
}

function isTelemetryEnvelope(value: unknown): value is TelemetryEnvelope {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<TelemetryEnvelope>
  return typeof candidate.type === 'string' && typeof candidate.timestamp === 'string' && typeof candidate.elapsedMs === 'number'
}

function normalizeEndpointUrl(value: string): string {
  return value.trim()
}

function pruneEvents(events: TelemetryEnvelope[], encoder: TextEncoder): TelemetryEnvelope[] {
  const next = events.slice(-TELEMETRY_MAX_EVENTS)
  while (next.length > 0 && computeEventsBytes(next, encoder) > TELEMETRY_MAX_BYTES) {
    next.shift()
  }
  return next
}

function computeEventsBytes(events: TelemetryEnvelope[], encoder: TextEncoder): number {
  return encoder.encode(JSON.stringify(events)).length
}
