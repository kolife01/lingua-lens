import {
  waitForEvenAppBridge,
  TextContainerProperty,
  ImageContainerProperty,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import {
  OPENAI_API_KEY_STORAGE_KEY,
  type SessionLogEntry,
  loadStoredApiKey,
  saveStoredApiKey,
  loadSessionLog,
  saveSessionLog,
} from './storage'
import { mountUi, renderSetupScreen, setEngineState, setHudCard, setTranscript, setTranscriptMeta } from './ui'
import {
  createCoachEngine,
  createMockCoachEngine,
  type CoachDecision,
  type TranscriptTurn,
  type CoachEngine,
} from './coach'
import { createHudRenderer } from './hud'
import { createBatchTranscriber } from './asr/stt'
import { createDemoScript } from './demo'

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
const DEMO_MODE = DEMO_PARAM === '1' || DEMO_PARAM === 'true'
const FORCE_MOCK = MOCK_PARAM === '1' || MOCK_PARAM === 'true'

type EngineMode = 'setup' | 'live' | 'demo'
type TranscriptRole = 'speaker' | 'partner'

interface TranscriptEntry extends TranscriptTurn {
  id: string
  createdAt: number
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
let activeCard: CoachDecision = { type: 'NONE', text: '', ttl_ms: 0 }
let shutdownStarted = false
let lastSavedLog: SessionLogEntry[] = []
let activePcmHandler: ((pcm: Uint8Array) => void) | null = null
let activeShutdownHandler: (() => Promise<void>) | null = null

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
  activeShutdownHandler = async () => {
    await stopLive()
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
}

async function startLive(): Promise<void> {
  mode = 'live'
  coach = FORCE_MOCK ? createMockCoachEngine() : createCoachEngine(apiKey)
  transcriptLog = []
  activeCard = { type: 'NONE', text: '', ttl_ms: 0 }
  setEngineState('listening', FORCE_MOCK ? 'Live mic · mock coach' : 'Live mic · OpenAI coach')
  setTranscript('', '')
  setTranscriptMeta(lastSavedLog[0]?.text ? `Previous recap: ${lastSavedLog[0].text}` : 'Listening for speech')
  await hud.renderIdle(
    'LIVE',
    lastSavedLog[0]?.text ? `Prev recap\n${lastSavedLog[0].text}` : 'Listening…',
    FORCE_MOCK ? 'Mock coach active' : 'GPT coach active',
    'LIVE',
  )

  const transcriber = createBatchTranscriber({
    apiKey,
    onTranscript: async text => {
      const normalized = normalizeTranscriptText(text)
      if (!normalized) return
      await registerTranscript(inferLiveRole(normalized), normalized, false)
    },
    onError: err => {
      console.error('ASR error:', err)
      setEngineState('error', `ASR: ${getErrorMessage(err)}`)
    },
  })

  await bridge.audioControl(true)
  activePcmHandler = pcm => transcriber.sendPcm(pcm)
  activeShutdownHandler = async () => {
    transcriber.close()
    await stopLive()
  }
}

async function startDemo(): Promise<void> {
  mode = 'demo'
  coach = apiKey && !FORCE_MOCK ? createCoachEngine(apiKey) : createMockCoachEngine()
  transcriptLog = []
  activeCard = { type: 'NONE', text: '', ttl_ms: 0 }
  const engineLabel = apiKey && !FORCE_MOCK ? 'Demo script · GPT coach' : 'Demo script · mock coach'
  setEngineState('connecting', engineLabel)
  setTranscript('', '')
  setTranscriptMeta('ASR bypassed in demo mode.')
  await hud.renderIdle('DEMO', 'Injecting scripted turns…', engineLabel, 'DEMO')

  activePcmHandler = null
  activeShutdownHandler = async () => {
    demo.stop()
    await stopLive()
  }

  const demo = createDemoScript()
  demo.start(async item => {
    await registerTranscript(item.role, item.text, true)
  })
}

async function stopLive(): Promise<void> {
  if (shutdownStarted) return
  shutdownStarted = true
  try {
    await bridge.audioControl(false)
  } catch {
    // ignore
  }
  if (transcriptLog.length > 0) {
    const recap = [...transcriptLog]
      .reverse()
      .find(entry => entry.role === 'speaker' && entry.text.length > 0)
    if (recap) {
      lastSavedLog = [{ type: activeCard.type, text: recap.text.slice(0, 120), createdAt: Date.now() }]
      await saveSessionLog(bridge, lastSavedLog)
    }
  }
  activePcmHandler = null
  activeShutdownHandler = null
}

function attachRootEvents(): void {
  const unsubscribe = bridge.onEvenHubEvent(event => {
    const pcm = event.audioEvent?.audioPcm
    if (pcm) activePcmHandler?.(pcm)

    const sysType = event.sysEvent?.eventType ?? null
    const textType = event.textEvent?.eventType ?? null

    if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
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
      void activeShutdownHandler?.()
    },
    { once: true },
  )
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
  const speakerLabel = role === 'speaker' ? 'You' : 'Partner'
  const transcriptView = transcriptLog.map(item => `${item.role === 'speaker' ? 'You' : 'Them'}: ${item.text}`).join('\n')
  setTranscript(transcriptView, '')
  setTranscriptMeta(fromDemo ? 'Demo timeline active' : 'Mic chunks transcribed in short windows')

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
  activeCard = decision
  if (decision.type === 'NONE') {
    await hud.renderIdle(
      mode === 'demo' ? 'DEMO' : 'LIVE',
      `${sourceLabel}: ${transcriptLog[transcriptLog.length - 1]?.text ?? ''}`.slice(0, 96),
      'No intervention',
      mode === 'demo' ? 'DEMO' : 'LIVE',
    )
    setHudCard('NONE', 'No intervention')
    return
  }

  const body = decision.text
  const aux = `${sourceLabel} · ${decision.ttl_ms}ms`
  await hud.renderCard(decision.type, body, aux)
  setHudCard(decision.type, body)
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
