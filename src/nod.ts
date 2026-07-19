export interface ImuSample {
  x: number
  y: number
  z: number
}

export interface NodDebugState {
  enabled: boolean
  imuActive: boolean
  pitchDeg: number
  detectCount: number
  lastEvent: string
}

interface NodDetectorOptions {
  cooldownMs?: number
  onDebug?: (state: NodDebugState) => void
  onNod?: () => void
}

type NodPhase = 'idle' | 'down'

const SAMPLE_WINDOW_SIZE = 5
const DOWN_DELTA_DEG = -2
const UP_DELTA_DEG = 2
const MIN_SWING_DEG = 7
const MAX_CYCLE_MS = 900

export function createNodDetector(options: NodDetectorOptions) {
  const cooldownMs = options.cooldownMs ?? 1200
  let enabled = false
  let imuActive = false
  let detectCount = 0
  let lastEvent = 'disabled'
  let pitchWindow: number[] = []
  let smoothedPitch = 0
  let lastSmoothedPitch: number | null = null
  let phase: NodPhase = 'idle'
  let downStartedAt = 0
  let minPitchDuringDown = 0
  let lastDetectedAt = -cooldownMs

  function setEnabled(value: boolean): void {
    enabled = value
    if (!value) {
      imuActive = false
      pitchWindow = []
      lastSmoothedPitch = null
      phase = 'idle'
      lastEvent = 'disabled'
    } else if (lastEvent === 'disabled') {
      lastEvent = 'waiting for IMU'
    }
    emitDebug()
  }

  function markImuAvailable(): void {
    imuActive = true
  }

  function processSample(sample: ImuSample, now = performance.now()): void {
    if (!enabled) return
    markImuAvailable()
    const pitchDeg = estimatePitchDeg(sample)
    pitchWindow.push(pitchDeg)
    if (pitchWindow.length > SAMPLE_WINDOW_SIZE) pitchWindow.shift()
    smoothedPitch = average(pitchWindow)

    if (lastSmoothedPitch === null) {
      lastSmoothedPitch = smoothedPitch
      lastEvent = 'warming up'
      emitDebug()
      return
    }

    const delta = smoothedPitch - lastSmoothedPitch
    lastSmoothedPitch = smoothedPitch

    if (now - lastDetectedAt < cooldownMs) {
      lastEvent = 'cooldown'
      emitDebug()
      return
    }

    if (phase === 'idle') {
      if (delta <= DOWN_DELTA_DEG) {
        phase = 'down'
        downStartedAt = now
        minPitchDuringDown = smoothedPitch
        lastEvent = 'down'
      } else {
        lastEvent = 'listening'
      }
      emitDebug()
      return
    }

    minPitchDuringDown = Math.min(minPitchDuringDown, smoothedPitch)
    if (now - downStartedAt > MAX_CYCLE_MS) {
      phase = 'idle'
      lastEvent = 'timeout'
      emitDebug()
      return
    }

    if (delta >= UP_DELTA_DEG && smoothedPitch - minPitchDuringDown >= MIN_SWING_DEG) {
      phase = 'idle'
      lastDetectedAt = now
      detectCount += 1
      lastEvent = 'detected'
      emitDebug()
      options.onNod?.()
      return
    }

    lastEvent = 'down'
    emitDebug()
  }

  function simulateNod(): void {
    if (!enabled) return
    imuActive = false
    detectCount += 1
    lastEvent = 'simulated'
    emitDebug()
    options.onNod?.()
  }

  function emitDebug(): void {
    options.onDebug?.({
      enabled,
      imuActive,
      pitchDeg: smoothedPitch,
      detectCount,
      lastEvent,
    })
  }

  return {
    processSample,
    setEnabled,
    simulateNod,
  }
}

function estimatePitchDeg(sample: ImuSample): number {
  const horizontal = Math.sqrt(sample.x * sample.x + sample.z * sample.z) || 1
  return (Math.atan2(sample.y, horizontal) * 180) / Math.PI
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
