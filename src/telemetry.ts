export interface TelemetryEventMap {
  asr: {
    transcript: string
    role: 'speaker' | 'partner'
    roleInference: {
      rule: string
      matches: Array<{
        keyword: string
        matchedText: string
      }>
    }
    rms: number
    asrLatencyMs: number
    audioSeconds: number
    bufferedMs: number
    model: string
    source: 'live'
  }
  decision: {
    trigger: 'transcript' | 'recap'
    transcriptWindow: Array<{
      role: 'speaker' | 'partner'
      text: string
      timestamp: string
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

export interface TelemetryLogger {
  log<TType extends TelemetryEventType>(type: TType, payload: TelemetryEventMap[TType]): void
}

export function createTelemetryLogger(): TelemetryLogger {
  if (!import.meta.env.DEV) {
    return {
      log: () => {},
    }
  }

  const startedAt = Date.now()

  return {
    log(type, payload) {
      try {
        const event: TelemetryEnvelope<typeof type> = {
          type,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - startedAt,
          payload,
        }

        void fetch('/__log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
          keepalive: true,
          mode: 'cors',
        }).catch(() => {})
      } catch {
        // ignore telemetry failures
      }
    },
  }
}
