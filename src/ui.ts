type Status = 'connecting' | 'listening' | 'error' | 'setup'
type CardType = 'HINT' | 'WORD' | 'RECAP' | 'NONE'
interface TelemetryPanelOptions {
  onEnabledChange: (enabled: boolean) => void | Promise<void>
  onEndpointChange: (endpointUrl: string) => void | Promise<void>
  onExport: () => void
  onClear: () => void | Promise<void>
}

let statusEl: HTMLDivElement
let metaEl: HTMLDivElement
let transcriptEl: HTMLPreElement
let cardEl: HTMLDivElement
let formHostEl: HTMLDivElement
let sessionModeEl: HTMLDivElement
let sessionTurnsEl: HTMLDivElement
let sessionCardEl: HTMLDivElement
let sessionRestoreEl: HTMLDivElement
let sessionRecapEl: HTMLDivElement
let budgetLabelEl: HTMLDivElement
let budgetSpentEl: HTMLDivElement
let budgetRemainingEl: HTMLDivElement
let budgetBarEl: HTMLDivElement
let vadGateEl: HTMLDivElement
let vadLevelEl: HTMLDivElement
let vadWindowEl: HTMLDivElement
let nodStateEl: HTMLDivElement
let nodPitchEl: HTMLDivElement
let nodCountEl: HTMLDivElement
let nodHintEl: HTMLDivElement
let telemetryToggleEl: HTMLInputElement
let telemetryEndpointEl: HTMLInputElement
let telemetryStatsEl: HTMLDivElement
let telemetryHintEl: HTMLDivElement

export function mountUi() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <main class="shell">
      <section class="hero-panel">
        <p class="eyebrow">Even G2 conversation coach</p>
        <h1>LinguaLens</h1>
        <div id="status" class="status status-connecting">Booting…</div>
        <p class="lead">Live English coaching for HUD playback, with transcript context, background restore, and simulator-safe debug panels.</p>
        <div id="form-host"></div>
      </section>
      <section class="grid">
        <article class="panel">
          <header class="panel-head">
            <h2>Transcript</h2>
            <div id="meta" class="meta">Waiting for stream…</div>
          </header>
          <pre id="transcript" class="transcript"></pre>
        </article>
        <section class="side-stack">
          <article class="panel card-panel">
            <header class="panel-head">
              <h2>HUD Preview</h2>
            </header>
            <div id="card" class="hud-card hud-none">No intervention</div>
          </article>
          <article class="panel state-panel">
            <header class="panel-head">
              <h2>Session State</h2>
            </header>
            <div class="signal-grid">
              <div id="session-mode" class="signal-line">Mode: --</div>
              <div id="session-turns" class="signal-line">Turns: 0</div>
              <div id="session-card" class="signal-line">Card: NONE</div>
              <div id="session-restore" class="signal-line">Restore: idle</div>
              <div id="session-recap" class="signal-line signal-wide">Recap: --</div>
            </div>
          </article>
          <article class="panel state-panel">
            <header class="panel-head">
              <h2>Daily Budget</h2>
              <div id="budget-label" class="meta">$0.00 / $1.00</div>
            </header>
            <div class="budget-panel">
              <div class="budget-track">
                <div id="budget-bar" class="budget-fill"></div>
              </div>
              <div class="budget-row">
                <div id="budget-spent" class="signal-line">Spent: $0.00</div>
                <div id="budget-remaining" class="signal-line">Remaining: $1.00</div>
              </div>
            </div>
          </article>
          <article class="panel signal-panel">
            <header class="panel-head">
              <h2>Signals</h2>
            </header>
            <div class="signal-grid">
              <div id="vad-gate" class="signal-line">VAD: waiting</div>
              <div id="vad-level" class="signal-line">RMS: -- / --</div>
              <div id="vad-window" class="signal-line">Window: --</div>
              <div id="nod-state" class="signal-line">Nod: off</div>
              <div id="nod-pitch" class="signal-line">Pitch: --</div>
              <div id="nod-count" class="signal-line">Detected: 0</div>
              <div id="nod-hint" class="nod-hint signal-wide">Add <code>?nod=1</code> to enable. Press <code>N</code> to simulate when enabled.</div>
            </div>
          </article>
          <article class="panel telemetry-panel">
            <header class="panel-head">
              <h2>Telemetry</h2>
              <div id="telemetry-stats" class="meta">0 events · 0 KB</div>
            </header>
            <div class="telemetry-copy">Logs stay on this device unless you set an endpoint.</div>
            <div class="telemetry-grid">
              <label class="toggle-row" for="telemetry-enabled">
                <span>Record telemetry</span>
                <input id="telemetry-enabled" type="checkbox" checked />
              </label>
              <label class="telemetry-field signal-wide" for="telemetry-endpoint">
                <span>Log endpoint URL</span>
                <input id="telemetry-endpoint" type="url" inputmode="url" placeholder="" autocomplete="off" />
              </label>
              <div id="telemetry-hint" class="nod-hint signal-wide"></div>
              <div class="telemetry-actions signal-wide">
                <button id="telemetry-export" type="button" class="secondary-button">Export</button>
                <button id="telemetry-clear" type="button" class="secondary-button secondary-danger">Clear</button>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  `

  statusEl = app.querySelector<HTMLDivElement>('#status')!
  metaEl = app.querySelector<HTMLDivElement>('#meta')!
  transcriptEl = app.querySelector<HTMLPreElement>('#transcript')!
  cardEl = app.querySelector<HTMLDivElement>('#card')!
  formHostEl = app.querySelector<HTMLDivElement>('#form-host')!
  sessionModeEl = app.querySelector<HTMLDivElement>('#session-mode')!
  sessionTurnsEl = app.querySelector<HTMLDivElement>('#session-turns')!
  sessionCardEl = app.querySelector<HTMLDivElement>('#session-card')!
  sessionRestoreEl = app.querySelector<HTMLDivElement>('#session-restore')!
  sessionRecapEl = app.querySelector<HTMLDivElement>('#session-recap')!
  budgetLabelEl = app.querySelector<HTMLDivElement>('#budget-label')!
  budgetSpentEl = app.querySelector<HTMLDivElement>('#budget-spent')!
  budgetRemainingEl = app.querySelector<HTMLDivElement>('#budget-remaining')!
  budgetBarEl = app.querySelector<HTMLDivElement>('#budget-bar')!
  vadGateEl = app.querySelector<HTMLDivElement>('#vad-gate')!
  vadLevelEl = app.querySelector<HTMLDivElement>('#vad-level')!
  vadWindowEl = app.querySelector<HTMLDivElement>('#vad-window')!
  nodStateEl = app.querySelector<HTMLDivElement>('#nod-state')!
  nodPitchEl = app.querySelector<HTMLDivElement>('#nod-pitch')!
  nodCountEl = app.querySelector<HTMLDivElement>('#nod-count')!
  nodHintEl = app.querySelector<HTMLDivElement>('#nod-hint')!
  telemetryToggleEl = app.querySelector<HTMLInputElement>('#telemetry-enabled')!
  telemetryEndpointEl = app.querySelector<HTMLInputElement>('#telemetry-endpoint')!
  telemetryStatsEl = app.querySelector<HTMLDivElement>('#telemetry-stats')!
  telemetryHintEl = app.querySelector<HTMLDivElement>('#telemetry-hint')!
  injectStyles()
}

export function setEngineState(kind: Status, text: string) {
  if (!statusEl) return
  statusEl.className = `status status-${kind}`
  statusEl.textContent = text
}

export function setTranscript(finalText: string, interimText: string) {
  if (!transcriptEl) return
  transcriptEl.textContent = `${finalText}${interimText ? `\n${interimText}` : ''}`.trim()
}

export function setTranscriptMeta(text: string) {
  if (!metaEl) return
  metaEl.textContent = text
}

export function setHudCard(type: CardType, text: string) {
  if (!cardEl) return
  cardEl.className = `hud-card hud-${type.toLowerCase()}`
  cardEl.textContent = text || 'No intervention'
}

export function setSessionDebug(options: {
  mode: string
  transcriptTurns: number
  activeCardType: CardType
  backgroundStatus: string
  lastRecap: string
}) {
  if (!sessionModeEl) return
  sessionModeEl.textContent = `Mode: ${options.mode}`
  sessionTurnsEl.textContent = `Turns: ${options.transcriptTurns}`
  sessionCardEl.textContent = `Card: ${options.activeCardType}`
  sessionRestoreEl.textContent = `Restore: ${options.backgroundStatus}`
  sessionRecapEl.textContent = `Recap: ${options.lastRecap || '--'}`
}

export function setVadDebug(options: {
  threshold: number
  rms: number
  forwarded: boolean
  bufferedMs: number
}) {
  if (!vadGateEl) return
  vadGateEl.textContent = `VAD: ${options.forwarded ? 'sent to ASR' : 'dropped as silence'}`
  vadLevelEl.textContent = `RMS: ${options.rms.toFixed(3)} / ${options.threshold.toFixed(3)}`
  vadWindowEl.textContent = `Window: ${options.bufferedMs}ms`
}

export function setNodDebug(options: {
  enabled: boolean
  imuActive: boolean
  pitchDeg: number
  detectCount: number
  lastEvent: string
}) {
  if (!nodStateEl) return
  nodStateEl.textContent = options.enabled
    ? `Nod: on · ${options.imuActive ? 'IMU active' : 'IMU waiting'} · ${options.lastEvent}`
    : 'Nod: off'
  nodPitchEl.textContent = `Pitch: ${options.enabled ? `${options.pitchDeg.toFixed(1)}°` : '--'}`
  nodCountEl.textContent = `Detected: ${options.detectCount}`
  nodHintEl.innerHTML = options.enabled
    ? 'Press <code>N</code> to simulate a nod in the simulator or demo.'
    : 'Add <code>?nod=1</code> to enable. Press <code>N</code> to simulate when enabled.'
}

export function setBudgetStatus(options: {
  spentUsd: number
  limitUsd: number
  remainingUsd: number
  reached: boolean
}) {
  if (!budgetLabelEl) return
  const ratioUsed = options.limitUsd > 0 ? Math.min(1, options.spentUsd / options.limitUsd) : 1
  budgetLabelEl.textContent = `${formatUsd(Math.min(options.spentUsd, options.limitUsd))} / ${formatUsd(options.limitUsd)}`
  budgetSpentEl.textContent = `Spent: ${formatUsd(options.spentUsd)}`
  budgetRemainingEl.textContent = `Remaining: ${formatUsd(options.remainingUsd)}`
  budgetRemainingEl.className = `signal-line${options.reached ? ' budget-alert' : ''}`
  budgetBarEl.style.width = `${Math.max(0, ratioUsed * 100)}%`
  budgetBarEl.className = `budget-fill${options.reached ? ' budget-fill-limit' : ''}`
}

export function renderSetupScreen(options: { onSubmit: (value: string) => void | Promise<void> }) {
  if (!formHostEl) return
  formHostEl.innerHTML = `
    <form id="setup-form" class="setup-form">
      <label for="api-key">OpenAI API key</label>
      <input id="api-key" name="apiKey" type="password" placeholder="sk-..." autocomplete="off" />
      <button type="submit">Save and start</button>
    </form>
  `

  const form = formHostEl.querySelector<HTMLFormElement>('#setup-form')!
  const input = formHostEl.querySelector<HTMLInputElement>('#api-key')!
  form.addEventListener('submit', event => {
    event.preventDefault()
    void options.onSubmit(input.value)
  })
}

export function bindTelemetryPanel(options: TelemetryPanelOptions): void {
  if (!telemetryToggleEl || !telemetryEndpointEl) return
  telemetryToggleEl.addEventListener('change', () => {
    void options.onEnabledChange(telemetryToggleEl.checked)
  })
  telemetryEndpointEl.addEventListener('change', () => {
    void options.onEndpointChange(telemetryEndpointEl.value)
  })
  telemetryEndpointEl.addEventListener('blur', () => {
    void options.onEndpointChange(telemetryEndpointEl.value)
  })
  document.querySelector<HTMLButtonElement>('#telemetry-export')?.addEventListener('click', () => {
    options.onExport()
  })
  document.querySelector<HTMLButtonElement>('#telemetry-clear')?.addEventListener('click', () => {
    void options.onClear()
  })
}

export function setTelemetryState(options: {
  enabled: boolean
  endpointUrl: string
  eventCount: number
  approximateBytes: number
  endpointSuggestion?: string
}): void {
  if (!telemetryToggleEl || !telemetryEndpointEl || !telemetryStatsEl || !telemetryHintEl) return
  telemetryToggleEl.checked = options.enabled
  if (telemetryEndpointEl.value !== options.endpointUrl) {
    telemetryEndpointEl.value = options.endpointUrl
  }
  telemetryEndpointEl.placeholder = options.endpointSuggestion ?? ''
  telemetryStatsEl.textContent = `${options.eventCount} events · ${formatKilobytes(options.approximateBytes)}`
  telemetryHintEl.innerHTML = options.endpointSuggestion
    ? `Leave blank to keep logs local. Dev suggestion: <code>${escapeHtml(options.endpointSuggestion)}</code>`
    : 'Leave blank to keep logs local.'
}

export function downloadJsonFile(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

function injectStyles() {
  const css = `
    :root {
      color-scheme: dark;
      --bg: #101614;
      --bg-soft: #17211e;
      --line: #2c3c36;
      --text: #edf4ef;
      --muted: #95a59d;
      --accent: #9dff7a;
      --hint: #8bf0c3;
      --word: #93c7ff;
      --recap: #ffb4d4;
      --warm: #ffd38f;
    }
    html, body {
      margin: 0;
      min-height: 100%;
      background:
        radial-gradient(circle at top left, rgba(157,255,122,0.14), transparent 32%),
        radial-gradient(circle at bottom right, rgba(255,211,143,0.12), transparent 26%),
        linear-gradient(180deg, #0d1311 0%, var(--bg) 100%);
      color: var(--text);
      font: 15px/1.45 'IBM Plex Sans', 'Avenir Next', sans-serif;
      -webkit-text-size-adjust: 100%;
    }
    #app { min-height: 100vh; }
    .shell {
      max-width: 1040px;
      margin: 0 auto;
      padding: 28px;
      display: grid;
      gap: 20px;
    }
    .hero-panel, .panel {
      background: rgba(23, 33, 30, 0.84);
      border: 1px solid var(--line);
      border-radius: 22px;
      backdrop-filter: blur(10px);
    }
    .hero-panel {
      padding: 24px;
      box-shadow: 0 20px 80px rgba(0, 0, 0, 0.24);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--warm);
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    h1, h2 {
      margin: 0;
      font-family: 'IBM Plex Sans Condensed', 'Avenir Next Condensed', sans-serif;
      letter-spacing: 0.02em;
    }
    h1 { font-size: 42px; }
    .lead {
      margin: 16px 0 0;
      max-width: 720px;
      color: var(--muted);
    }
    .status {
      display: inline-flex;
      margin-top: 14px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .status-connecting { color: #c5d4cb; border-color: #415149; }
    .status-listening { color: var(--accent); border-color: var(--accent); background: rgba(157,255,122,0.09); }
    .status-error { color: #ff9d95; border-color: #ff9d95; background: rgba(255,157,149,0.09); }
    .status-setup { color: var(--warm); border-color: var(--warm); background: rgba(255,211,143,0.09); }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
      gap: 20px;
      align-items: start;
    }
    .panel {
      padding: 20px;
      min-height: 220px;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      text-align: right;
    }
    .transcript {
      margin: 0;
      min-height: 220px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #ebf4ef;
      font: 16px/1.55 'IBM Plex Mono', 'SFMono-Regular', monospace;
    }
    .side-stack {
      display: grid;
      gap: 20px;
    }
    .card-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .signal-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .budget-panel {
      display: grid;
      gap: 14px;
    }
    .budget-track {
      width: 100%;
      height: 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
    }
    .budget-fill {
      height: 100%;
      width: 0%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--accent), var(--warm));
      transition: width 180ms ease;
    }
    .budget-fill-limit {
      background: linear-gradient(90deg, #ff9d95, #ffd38f);
    }
    .budget-row {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .budget-alert {
      color: #ffb8b1;
      border-color: #ff9d95;
    }
    .signal-line {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
        rgba(255, 255, 255, 0.03);
      font: 600 14px/1.35 'IBM Plex Mono', 'SFMono-Regular', monospace;
    }
    .signal-wide {
      grid-column: 1 / -1;
    }
    .nod-hint {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .nod-hint code {
      font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
      color: var(--warm);
    }
    .hud-card {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 22px;
      border-radius: 18px;
      border: 1px solid var(--line);
      font: 700 24px/1.35 'IBM Plex Sans Condensed', 'Avenir Next Condensed', sans-serif;
      letter-spacing: 0.01em;
      text-align: left;
      white-space: pre-line;
      min-height: 200px;
      background:
        radial-gradient(circle at top right, rgba(157,255,122,0.07), transparent 34%),
        linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.14));
    }
    .hud-none { color: #ced5d1; }
    .hud-hint { color: var(--hint); }
    .hud-word { color: var(--word); }
    .hud-recap { color: var(--recap); }
    .setup-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      margin-top: 18px;
      align-items: end;
      max-width: 560px;
    }
    .setup-form label {
      grid-column: 1 / -1;
      font-size: 13px;
      color: var(--muted);
    }
    .setup-form input {
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: rgba(8, 10, 10, 0.4);
      color: var(--text);
      font: inherit;
    }
    .setup-form button {
      padding: 12px 16px;
      border: 0;
      border-radius: 12px;
      background: var(--accent);
      color: #102010;
      font: 700 14px/1 'IBM Plex Sans', sans-serif;
      cursor: pointer;
    }
    .telemetry-panel {
      min-height: 0;
    }
    .telemetry-copy {
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .telemetry-grid {
      display: grid;
      gap: 12px;
    }
    .toggle-row,
    .telemetry-field {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
        rgba(255, 255, 255, 0.03);
    }
    .toggle-row {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      font: 600 14px/1.35 'IBM Plex Mono', 'SFMono-Regular', monospace;
    }
    .toggle-row input {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
    }
    .telemetry-field span {
      color: var(--muted);
      font-size: 12px;
    }
    .telemetry-field input {
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: rgba(8, 10, 10, 0.4);
      color: var(--text);
      font: inherit;
    }
    .telemetry-actions {
      display: flex;
      gap: 10px;
    }
    .secondary-button {
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      font: 700 14px/1 'IBM Plex Sans', sans-serif;
      cursor: pointer;
    }
    .secondary-danger {
      color: #ffb8b1;
      border-color: rgba(255, 157, 149, 0.45);
    }
    @media (max-width: 820px) {
      .shell { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
      .signal-grid { grid-template-columns: 1fr; }
      h1 { font-size: 34px; }
      .setup-form { grid-template-columns: 1fr; }
      .telemetry-actions { flex-direction: column; }
    }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatKilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
