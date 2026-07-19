import {
  waitForEvenAppBridge,
  TextContainerProperty,
  ImageContainerProperty,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ImuReportPace,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import {
  OPENAI_API_KEY_STORAGE_KEY,
  type BackgroundSessionState,
  type PersistedCoachCard,
  type PersistedTranscriptEntry,
  type SessionLogEntry,
  loadBackgroundState,
  loadStoredApiKey,
  saveBackgroundState,
  saveStoredApiKey,
  loadSessionLog,
  saveSessionLog,
} from './storage'
import {
  mountUi,
  renderSetupScreen,
  setEngineState,
  setHudCard,
  setSessionDebug,
  setNodDebug,
  setTranscript,
  setTranscriptMeta,
  setVadDebug,
} from './ui'
import {
  createCoachEngine,
  createMockCoachEngine,
  type CoachDecision,
  type TranscriptTurn,
  type CoachEngine,
} from './coach'
import { createHudRenderer } from './hud'
import { createBatchTranscriber } from './asr/stt'
import {
  DEMO_LOOP_DURATION_MS,
  DEMO_SCRIPT,
  getDemoItemsDueSince,
} from './demo'
import { createNodDetector, type ImuSample } from './nod'

const bridge = await waitForEvenAppBridge()

const PAGE_ID = 1
const STATUS_ID = 1
const BODY_ID = 2
const AUX_ID = 3
const HERO_ID = 4

const HERO_WIDTH = 200
const HERO_HEIGHT = 100

const DEMO_PARAM = new URLSearchParams(window.location.search).get('demo')
const MOCK_PARAM = new URLSearchParams(window.location.search).get('mock')
const LOOP_PARAM = new URLSearchParams(window.location.search).get('loop')
const NOD_PARAM = new URLSearchParams(window.location.search).get('nod')
const DEMO_MODE = DEMO_PARAM === '1' || DEMO_PARAM === 'true'
const FORCE_MOCK = MOCK_PARAM === '1' || MOCK_PARAM === 'true'
const LOOP_DEMO = LOOP_PARAM === '1' || LOOP_PARAM === 'true'
const NOD_MODE = NOD_PARAM === '1' || NOD_PARAM === 'true'
const RECAP_SILENCE_MS = 8000
const HEARTBEAT_INTERVAL_MS = 250
const NOD_TTL_EXTENSION_MS = 4000
const VAD_RMS_THRESHOLD = 0.012
const BACKGROUND_SYNC_DELAY_MS = 120

type EngineMode = 'setup' | 'live' | 'demo'
type TranscriptRole = 'speaker' | 'partner'

interface TranscriptEntry extends TranscriptTurn {
  id: string
  createdAt: number
}

interface BackgroundCapableBridge {
  setBackgroundState?: (value: string) => Promise<boolean>
  onBackgroundRestore?: (callback: (value: string) => void) => (() => void) | void
}

mountUi()

const hud = createHudRenderer({
  bridge,
  ids: {
    status: STATUS_ID,
    body: BODY_ID,
    aux: AUX_ID,
    hero: HERO_ID,
  },
})

let mode: EngineMode = DEMO_MODE ? 'demo' : 'live'
let apiKey = ''
let coach: CoachEngine | null = null
let transcriptLog: TranscriptEntry[] = []
let activeCard: CoachDecision = { type: 'NONE', text: '', ttl_ms: 0, choices: [] }
let activeCardDisplayText = ''
let shutdownStarted = false
let lastSavedLog: SessionLogEntry[] = []
let activePcmHandler: ((pcm: Uint8Array) => void) | null = null
let activeShutdownHandler: (() => Promise<void>) | null = null
let recapInFlight = false
let activeCardShownAt = 0
let lastSpeechAt = 0
let recapCycleToken = 0
let recapTriggeredToken = -1
let recapTriggerSourceIsDemo = false
let demoLoopIndex = 0
let demoInjectedCount = 0
let demoHeartbeatStartAt = 0
let nodDebugLastRenderedAt = 0
let nodImuRequested = false
let backgroundSyncTimer: number | null = null
let backgroundStatus = 'idle'
let latestRestoredAt = 0

const backgroundBridge = createBackgroundSessionBridge(bridge)
const unsubscribeBackgroundRestore = backgroundBridge.onRestore(state => {
  void restoreSessionState(state)
})

window.setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS)

const nodDetector = createNodDetector({
  cooldownMs: 1200,
  onDebug: state => {
    const now = performance.now()
    if (now - nodDebugLastRenderedAt < 100 && state.lastEvent !== 'detected' && state.lastEvent !== 'simulated') return
    nodDebugLastRenderedAt = now
    setNodDebug(state)
  },
  onNod: () => {
    void handleNodGesture()
  },
})
nodDetector.setEnabled(NOD_MODE)

await initializePage()
attachRootEvents()
await boot()

async function initializePage(): Promise<void> {
  const status = new TextContainerProperty({
    xPosition: 12,
    yPosition: 10,
    width: 352,
    height: 40,
    borderWidth: 0,
    paddingLength: 0,
    containerID: STATUS_ID,
    containerName: 'status',
    content: 'LinguaLens',
  })
  const body = new TextContainerProperty({
    xPosition: 12,
    yPosition: 56,
    width: 352,
    height: 176,
    borderWidth: 0,
    paddingLength: 0,
    containerID: BODY_ID,
    containerName: 'body',
    content: 'Booting…',
    isEventCapture: 1,
  })
  const aux = new TextContainerProperty({
    xPosition: 12,
    yPosition: 236,
    width: 552,
    height: 40,
    borderWidth: 0,
    paddingLength: 0,
    containerID: AUX_ID,
    containerName: 'aux',
    content: 'Double-tap to exit',
  })
  const hero = new ImageContainerProperty({
    xPosition: 368,
    yPosition: 10,
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    containerID: HERO_ID,
    containerName: 'hero',
  })

  const created = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 4,
      textObject: [status, body, aux],
      imageObject: [hero],
    }),
  )

  if (created !== 0) {
    await bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 4,
        textObject: [status, body, aux],
        imageObject: [hero],
      }),
    )
  }
}

async function boot(): Promise<void> {
  apiKey = (await loadStoredApiKey(bridge)) ?? ''
  lastSavedLog = await loadSessionLog(bridge)
  refreshSessionDebug()

  const restored = await loadBackgroundState(bridge)
  if (restored && restored.savedAt > latestRestoredAt) {
    latestRestoredAt = restored.savedAt
    const resumed = await restoreSessionState(restored)
    if (resumed) return
  }

  if (DEMO_MODE) {
    await startDemo()
    return
  }

  if (!apiKey) {
    mode = 'setup'
    await enterSetup()
    return
  }

  await startLive()
}

async function enterSetup(): Promise<void> {
  setEngineState('setup', 'OpenAI API key required once')
  setTranscriptMeta(`Stored in bridge local storage under ${OPENAI_API_KEY_STORAGE_KEY}.`)
  activePcmHandler = null
  await setNodMonitoring(false)
  activeShutdownHandler = async () => {
    await endSession()
  }
  renderSetupScreen({
    onSubmit: async value => {
      const trimmed = value.trim()
      if (!trimmed) return
      const saved = await saveStoredApiKey(bridge, trimmed)
      if (!saved) {
        setEngineState('error', 'Failed to store API key')
        return
      }
      apiKey = trimmed
      await startLive()
    },
  })
  await hud.renderIdle(
    'SETUP',
    'Enter OpenAI key\non phone once.',
    lastSavedLog[0]?.text ? `Last recap: ${lastSavedLog[0].text}` : 'No recap yet',
    'SETUP',
  )
  backgroundStatus = 'setup armed'
  refreshSessionDebug()
  scheduleBackgroundSync()
}

async function startLive(restored?: BackgroundSessionState): Promise<void> {
  mode = 'live'
  shutdownStarted = false
  coach = FORCE_MOCK ? createMockCoachEngine() : createCoachEngine(apiKey)
  transcriptLog = restored ? restoreTranscriptEntries(restored.transcriptLog) : []
  activeCard = restored ? restoreCoachCard(restored.activeCard) : { type: 'NONE', text: '', ttl_ms: 0, choices: [] }
  activeCardDisplayText = ''
  activeCardShownAt = 0
  lastSpeechAt = 0
  recapCycleToken = 0
  recapTriggeredToken = -1
  recapTriggerSourceIsDemo = false
  demoLoopIndex = 0
  demoInjectedCount = 0
  demoHeartbeatStartAt = 0
  setEngineState('listening', FORCE_MOCK ? 'Live mic · mock coach' : 'Live mic · OpenAI coach')
  if (restored) {
    lastSavedLog = restored.learningLog
  }
  renderTranscriptPanel(restored ? 'Session restored from background' : lastSavedLog[0]?.text ? `Previous recap: ${lastSavedLog[0].text}` : 'Listening for speech')
  if (activeCard.type !== 'NONE') {
    await presentDecision('RESTORED', activeCard)
  } else if (lastSavedLog[0]?.type === 'RECAP' && lastSavedLog[0]?.text) {
    await presentDecision('RECAP', {
      type: 'RECAP',
      text: lastSavedLog[0].text,
      ttl_ms: 5000,
      choices: [],
    })
  } else {
    await hud.renderIdle(
      'LIVE',
      'Listening…',
      FORCE_MOCK ? 'Mock coach active' : 'GPT coach active',
      'LIVE',
    )
    setHudCard('NONE', 'No intervention')
  }

  const transcriber = createBatchTranscriber({
    apiKey,
    onTranscript: async text => {
      const normalized = normalizeTranscriptText(text)
      if (!normalized) return
      await registerTranscript(inferLiveRole(normalized), normalized, false)
    },
    onVadDebug: info => {
      setVadDebug(info)
    },
    onError: err => {
      console.error('ASR error:', err)
      setEngineState('error', `ASR: ${getErrorMessage(err)}`)
    },
    rmsThreshold: VAD_RMS_THRESHOLD,
  })

  await bridge.audioControl(true)
  await setNodMonitoring(true)
  activePcmHandler = pcm => transcriber.sendPcm(pcm)
  activeShutdownHandler = async () => {
    await transcriber.close()
    await endSession()
  }
  backgroundStatus = restored ? 'restored' : 'armed'
  refreshSessionDebug()
  scheduleBackgroundSync()
}

async function startDemo(restored?: BackgroundSessionState): Promise<void> {
  mode = 'demo'
  shutdownStarted = false
  coach = apiKey && !FORCE_MOCK ? createCoachEngine(apiKey) : createMockCoachEngine()
  transcriptLog = restored ? restoreTranscriptEntries(restored.transcriptLog) : []
  activeCard = restored ? restoreCoachCard(restored.activeCard) : { type: 'NONE', text: '', ttl_ms: 0, choices: [] }
  activeCardDisplayText = ''
  activeCardShownAt = 0
  const engineLabel = apiKey && !FORCE_MOCK ? 'Demo script · GPT coach' : 'Demo script · mock coach'
  setEngineState('connecting', engineLabel)
  if (restored) {
    lastSavedLog = restored.learningLog
  }
  renderTranscriptPanel(LOOP_DEMO ? 'ASR bypassed in demo mode · looping script' : 'ASR bypassed in demo mode.')
  if (activeCard.type !== 'NONE') {
    await presentDecision('RESTORED', activeCard)
  } else {
    await hud.renderIdle('DEMO', 'Injecting scripted turns…', engineLabel, 'DEMO')
    setHudCard('NONE', 'No intervention')
  }

  activePcmHandler = null
  activeShutdownHandler = async () => {
    await endSession()
  }
  demoInjectedCount = 0
  demoLoopIndex = 0
  demoHeartbeatStartAt = performance.now()
  lastSpeechAt = demoHeartbeatStartAt
  recapCycleToken = 0
  recapTriggeredToken = -1
  recapTriggerSourceIsDemo = true
  await setNodMonitoring(true)
  backgroundStatus = restored ? 'restored' : 'armed'
  refreshSessionDebug()
  scheduleBackgroundSync()
}

async function endSession(): Promise<void> {
  if (shutdownStarted) return
  shutdownStarted = true
  try {
    await bridge.audioControl(false)
  } catch {
    // ignore
  }
  await setNodMonitoring(false)
  await persistLatestRecap()
  await saveBackgroundState(bridge, null)
  activePcmHandler = null
  activeShutdownHandler = null
  activeCardDisplayText = ''
  activeCardShownAt = 0
  lastSpeechAt = 0
  backgroundStatus = 'cleared'
  refreshSessionDebug()
}

function attachRootEvents(): void {
  const unsubscribe = bridge.onEvenHubEvent(event => {
    const pcm = event.audioEvent?.audioPcm
    if (pcm) activePcmHandler?.(pcm)

    const imu = event.sysEvent?.imuData
    if (NOD_MODE && imu) {
      nodDetector.processSample(imu as ImuSample)
    }

    const sysType = event.sysEvent?.eventType ?? null
    const textType = event.textEvent?.eventType ?? null

    if (sysType === OsEventTypeList.FOREGROUND_EXIT_EVENT) {
      backgroundStatus = 'backgrounded'
      scheduleBackgroundSync()
    }

    if (sysType === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
      backgroundStatus = 'foreground'
      refreshSessionDebug()
      void restoreSessionFromStorage()
    }

    if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      backgroundStatus = 'closing'
      void saveBackgroundState(bridge, null)
      void bridge.shutDownPageContainer(PAGE_ID)
      return
    }

    if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
      unsubscribe()
      void activeShutdownHandler?.()
    }
  })

  window.addEventListener(
    'beforeunload',
    () => {
      unsubscribe()
      unsubscribeBackgroundRestore()
      void persistBackgroundState()
    },
    { once: true },
  )

  window.addEventListener('keydown', event => {
    if (event.repeat) return
    if (event.key.toLowerCase() !== 'n') return
    nodDetector.simulateNod()
  })
}

async function registerTranscript(role: TranscriptRole, text: string, fromDemo: boolean): Promise<void> {
  const entry: TranscriptEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    text,
    timestamp: new Date().toISOString(),
    createdAt: Date.now(),
  }

  transcriptLog = [...transcriptLog, entry].slice(-12)
  lastSpeechAt = performance.now()
  recapCycleToken += 1
  recapTriggerSourceIsDemo = fromDemo
  const speakerLabel = role === 'speaker' ? 'You' : 'Partner'
  setTranscriptMeta(fromDemo ? 'Demo timeline active' : 'Mic chunks transcribed in short windows')
  renderTranscriptPanel(fromDemo ? 'Demo timeline active' : 'Mic chunks transcribed in short windows')
  scheduleBackgroundSync()

  const currentCoach = coach
  if (!currentCoach) return

  try {
    const decision = await currentCoach.decide({
      mode,
      transcriptWindow: transcriptLog,
      previousCard: activeCard,
    })
    await renderDecision(speakerLabel, decision)
  } catch (err) {
    console.error('Coach error:', err)
    setEngineState('error', `Coach: ${getErrorMessage(err)}`)
  }
}

async function renderDecision(sourceLabel: string, decision: CoachDecision): Promise<void> {
  if (decision.type === 'NONE') {
    if (activeCard.type !== 'NONE' && activeCardShownAt > 0) {
      const now = performance.now()
      if (now - activeCardShownAt < activeCard.ttl_ms) return
    }
    await renderQuiet(`${mode === 'demo' ? 'DEMO' : 'LIVE'} · ${sourceLabel}`)
    return
  }

  await presentDecision(sourceLabel, decision)
}

async function presentDecision(sourceLabel: string, decision: CoachDecision): Promise<void> {
  activeCard = decision
  activeCardDisplayText = buildCardBody(decision)
  activeCardShownAt = performance.now()
  const body = activeCardDisplayText
  const aux = `${sourceLabel} · ${decision.ttl_ms}ms`
  await hud.renderCard(decision.type, body, aux)
  setHudCard(decision.type, body)
  refreshSessionDebug()
  scheduleBackgroundSync()
}

async function renderQuiet(status: string): Promise<void> {
  activeCard = { type: 'NONE', text: '', ttl_ms: 0, choices: [] }
  activeCardDisplayText = ''
  activeCardShownAt = 0
  await hud.renderQuiet(status)
  setHudCard('NONE', 'No intervention')
  refreshSessionDebug()
  scheduleBackgroundSync()
}

async function handleNodGesture(): Promise<void> {
  if (!NOD_MODE) return

  if (activeCard.type !== 'NONE' && activeCardShownAt > 0) {
    activeCard = {
      ...activeCard,
      ttl_ms: activeCard.ttl_ms + NOD_TTL_EXTENSION_MS,
    }
    await hud.renderCard(activeCard.type, activeCardDisplayText || activeCard.text, `NOD · ${activeCard.ttl_ms}ms`)
    setHudCard(activeCard.type, activeCardDisplayText || activeCard.text)
    scheduleBackgroundSync()
    return
  }

  const recapText = findLatestRecapText()
  if (!recapText) return
  await presentDecision('RECAP nod', {
    type: 'RECAP',
    text: recapText,
    ttl_ms: 5000,
    choices: [],
  })
}

async function triggerRecap(fromDemo: boolean): Promise<void> {
  if (recapInFlight || !coach || transcriptLog.length === 0) return
  const lastEntry = transcriptLog[transcriptLog.length - 1]
  if (!lastEntry || lastEntry.text.startsWith('[RECAP] ')) return

  recapInFlight = true
  try {
    const decision = await coach.createRecap(transcriptLog)
    if (decision.type === 'NONE') return
    transcriptLog = [
      ...transcriptLog,
      {
        id: `${Date.now()}-recap`,
        role: 'speaker' as const,
        text: `[RECAP] ${decision.text}`,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      },
    ].slice(-12)
    setTranscriptMeta(fromDemo ? 'Demo timeline active · recap pause' : 'Silence recap generated')
    renderTranscriptPanel(fromDemo ? 'Demo timeline active · recap pause' : 'Silence recap generated')
    lastSavedLog = [{ type: 'RECAP', text: decision.text, createdAt: Date.now() }]
    await presentDecision('RECAP pause', decision)
    scheduleBackgroundSync()
  } catch (err) {
    console.error('Recap error:', err)
    setEngineState('error', `Recap: ${getErrorMessage(err)}`)
  } finally {
    recapInFlight = false
  }
}

function runHeartbeat(): void {
  const now = performance.now()

  if (mode === 'demo' && demoHeartbeatStartAt > 0) {
    const elapsedInLoop = updateDemoLoop(now)
    const dueItems = getDemoItemsDueSince(DEMO_SCRIPT, elapsedInLoop, demoInjectedCount)
    if (dueItems.length > 0) {
      demoInjectedCount += dueItems.length
      for (const item of dueItems) {
        void registerTranscript(item.role, item.text, true)
      }
    }
  }

  if (activeCard.type !== 'NONE' && activeCardShownAt > 0 && now - activeCardShownAt >= activeCard.ttl_ms) {
    void renderQuiet(mode === 'demo' ? 'DEMO quiet' : 'LIVE quiet')
  }

  if (
    lastSpeechAt > 0 &&
    now - lastSpeechAt > RECAP_SILENCE_MS &&
    recapTriggeredToken !== recapCycleToken &&
    !recapInFlight
  ) {
    recapTriggeredToken = recapCycleToken
    void triggerRecap(recapTriggerSourceIsDemo)
  }
}

function updateDemoLoop(now: number): number {
  if (!LOOP_DEMO) return Math.max(0, now - demoHeartbeatStartAt)
  const totalElapsed = Math.max(0, now - demoHeartbeatStartAt)
  const nextLoopIndex = Math.floor(totalElapsed / DEMO_LOOP_DURATION_MS)
  if (nextLoopIndex !== demoLoopIndex) {
    demoLoopIndex = nextLoopIndex
    demoInjectedCount = 0
    recapCycleToken += 1
    recapTriggeredToken = -1
  }
  return totalElapsed % DEMO_LOOP_DURATION_MS
}

function normalizeTranscriptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function inferLiveRole(text: string): TranscriptRole {
  const lower = text.toLowerCase()
  const previousRole = transcriptLog[transcriptLog.length - 1]?.role
  if (/(could you|can you|do you|is it|are you|what|why|when|deadline|stakeholder)/.test(lower)) {
    return 'partner'
  }
  if (/(i |we |my |our |let me|i'm|i am|uh|um)/.test(lower)) {
    return 'speaker'
  }
  return previousRole === 'speaker' ? 'partner' : 'speaker'
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function setNodMonitoring(shouldEnable: boolean): Promise<void> {
  if (!NOD_MODE) {
    nodDetector.setEnabled(false)
    return
  }
  nodDetector.setEnabled(shouldEnable)
  if (!shouldEnable) {
    if (nodImuRequested) {
      nodImuRequested = false
      try {
        await bridge.imuControl(false, ImuReportPace.P100)
      } catch {
        // ignore
      }
    }
    return
  }
  try {
    nodImuRequested = await bridge.imuControl(true, ImuReportPace.P100)
  } catch {
    nodImuRequested = false
  }
}

function buildCardBody(decision: CoachDecision): string {
  if (decision.type !== 'HINT') return decision.text
  return decision.choices.map((choice, index) => `${index + 1} ${choice.english} · ${choice.label}`).join('\n')
}

function findLatestRecapText(): string | null {
  const latestFromSession = [...transcriptLog]
    .reverse()
    .find(entry => entry.role === 'speaker' && entry.text.startsWith('[RECAP] '))
  if (latestFromSession) {
    return latestFromSession.text.replace(/^\[RECAP\]\s*/, '').trim() || null
  }
  const saved = lastSavedLog[0]?.type === 'RECAP' ? lastSavedLog[0].text.trim() : ''
  return saved || null
}

function renderTranscriptPanel(metaText: string): void {
  const transcriptView = transcriptLog.map(item => `${item.role === 'speaker' ? 'You' : 'Them'}: ${item.text}`).join('\n')
  setTranscript(transcriptView, '')
  setTranscriptMeta(metaText)
  refreshSessionDebug()
}

function refreshSessionDebug(): void {
  setSessionDebug({
    mode: mode.toUpperCase(),
    transcriptTurns: transcriptLog.length,
    activeCardType: activeCard.type,
    backgroundStatus,
    lastRecap: findLatestRecapText() ?? '',
  })
}

function buildBackgroundSnapshot(): BackgroundSessionState {
  return {
    mode,
    transcriptLog: transcriptLog.map(entry => ({ ...entry })) satisfies PersistedTranscriptEntry[],
    learningLog: [...lastSavedLog].slice(0, 6),
    activeCard: toPersistedCoachCard(activeCard),
    savedAt: Date.now(),
  }
}

function scheduleBackgroundSync(): void {
  refreshSessionDebug()
  if (backgroundSyncTimer !== null) return
  backgroundSyncTimer = window.setTimeout(() => {
    backgroundSyncTimer = null
    void persistBackgroundState()
  }, BACKGROUND_SYNC_DELAY_MS)
}

async function persistBackgroundState(): Promise<void> {
  const snapshot = buildBackgroundSnapshot()
  await saveBackgroundState(bridge, snapshot)
  await backgroundBridge.setState(snapshot)
}

async function restoreSessionFromStorage(): Promise<void> {
  const snapshot = await loadBackgroundState(bridge)
  if (!snapshot) return
  await restoreSessionState(snapshot)
}

async function restoreSessionState(snapshot: BackgroundSessionState): Promise<boolean> {
  if (!snapshot || snapshot.savedAt <= latestRestoredAt) return false
  latestRestoredAt = snapshot.savedAt
  backgroundStatus = 'restoring'
  refreshSessionDebug()

  if (snapshot.mode === 'demo') {
    await startDemo(snapshot)
    return true
  }

  if (snapshot.mode === 'live') {
    if (!apiKey && !FORCE_MOCK) return false
    await startLive(snapshot)
    return true
  }

  if (snapshot.mode === 'setup') {
    lastSavedLog = snapshot.learningLog
    transcriptLog = restoreTranscriptEntries(snapshot.transcriptLog)
    activeCard = restoreCoachCard(snapshot.activeCard)
    renderTranscriptPanel('Setup state restored')
    await enterSetup()
    return true
  }

  return false
}

function restoreTranscriptEntries(entries: PersistedTranscriptEntry[]): TranscriptEntry[] {
  return Array.isArray(entries) ? entries.slice(-12).map(entry => ({ ...entry })) : []
}

function restoreCoachCard(card: PersistedCoachCard | null | undefined): CoachDecision {
  if (!card) return { type: 'NONE', text: '', ttl_ms: 0, choices: [] }
  return {
    type: card.type,
    text: card.text,
    ttl_ms: card.ttl_ms,
    choices: Array.isArray(card.choices) ? card.choices.map(choice => ({ ...choice })) : [],
  }
}

function toPersistedCoachCard(card: CoachDecision): PersistedCoachCard {
  return {
    type: card.type,
    text: card.text,
    ttl_ms: card.ttl_ms,
    choices: card.choices.map(choice => ({ ...choice })),
  }
}

async function persistLatestRecap(): Promise<void> {
  const latestRecap = [...transcriptLog]
    .reverse()
    .find(entry => entry.role === 'speaker' && entry.text.startsWith('[RECAP] '))
  if (!latestRecap) return
  lastSavedLog = [{ type: 'RECAP', text: latestRecap.text.replace(/^\[RECAP\]\s*/, '').slice(0, 120), createdAt: Date.now() }]
  await saveSessionLog(bridge, lastSavedLog)
}

function createBackgroundSessionBridge(bridgeInstance: typeof bridge) {
  const compatibleBridge = bridgeInstance as typeof bridgeInstance & BackgroundCapableBridge

  async function setState(state: BackgroundSessionState): Promise<void> {
    const raw = JSON.stringify(state)
    try {
      if (typeof compatibleBridge.setBackgroundState === 'function') {
        await compatibleBridge.setBackgroundState(raw)
        return
      }
      await bridgeInstance.callEvenApp('setBackgroundState', raw)
    } catch {
      try {
        await bridgeInstance.callEvenApp('setBackgroundState', { state: raw })
      } catch {
        // ignore; local storage snapshot is the hard fallback
      }
    }
  }

  function onRestore(callback: (state: BackgroundSessionState) => void): () => void {
    if (typeof compatibleBridge.onBackgroundRestore === 'function') {
      const unsubscribe = compatibleBridge.onBackgroundRestore(raw => {
        const parsed = parseBackgroundPayload(raw)
        if (parsed) callback(parsed)
      })
      return typeof unsubscribe === 'function' ? unsubscribe : () => {}
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string | { state?: string }>).detail
      const raw = typeof detail === 'string' ? detail : detail?.state
      const parsed = parseBackgroundPayload(raw)
      if (parsed) callback(parsed)
    }

    window.addEventListener('evenAppBackgroundRestore', handler as EventListener)
    return () => {
      window.removeEventListener('evenAppBackgroundRestore', handler as EventListener)
    }
  }

  return {
    setState,
    onRestore,
  }
}

function parseBackgroundPayload(raw: string | undefined): BackgroundSessionState | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as BackgroundSessionState
  } catch {
    return null
  }
}
