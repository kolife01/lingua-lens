type Status = 'connecting' | 'listening' | 'error' | 'setup'
type CardType = 'HINT' | 'WORD' | 'RECAP' | 'NONE'

let statusEl: HTMLDivElement
let metaEl: HTMLDivElement
let transcriptEl: HTMLPreElement
let cardEl: HTMLDivElement
let formHostEl: HTMLDivElement

export function mountUi() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <main class="shell">
      <section class="hero-panel">
        <p class="eyebrow">Even G2 conversation coach</p>
        <h1>LinguaLens</h1>
        <div id="status" class="status status-connecting">Booting…</div>
        <p class="lead">HUD-safe coaching cards for English conversations. Demo mode can bypass ASR and still exercise the full pipeline.</p>
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
        <article class="panel card-panel">
          <header class="panel-head">
            <h2>HUD Card</h2>
          </header>
          <div id="card" class="hud-card hud-none">No intervention</div>
        </article>
      </section>
    </main>
  `

  statusEl = app.querySelector<HTMLDivElement>('#status')!
  metaEl = app.querySelector<HTMLDivElement>('#meta')!
  transcriptEl = app.querySelector<HTMLPreElement>('#transcript')!
  cardEl = app.querySelector<HTMLDivElement>('#card')!
  formHostEl = app.querySelector<HTMLDivElement>('#form-host')!
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
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
      gap: 20px;
    }
    .panel {
      padding: 20px;
      min-height: 280px;
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
    .card-panel { display: flex; flex-direction: column; }
    .hud-card {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      border-radius: 18px;
      border: 1px solid var(--line);
      font: 700 30px/1.1 'IBM Plex Sans Condensed', 'Avenir Next Condensed', sans-serif;
      letter-spacing: 0.01em;
      text-align: center;
      min-height: 220px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.12));
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
    @media (max-width: 820px) {
      .shell { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
      h1 { font-size: 34px; }
      .setup-form { grid-template-columns: 1fr; }
    }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
