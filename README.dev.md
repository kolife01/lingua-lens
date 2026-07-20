# LinguaLens Developer Notes

## Setup

```bash
npm install
npm run dev
```

First launch without a saved API key shows a setup form in the companion WebView. The key is stored once with `bridge.setLocalStorage('lingualens.openai_api_key', ...)`.

## Simulator

Live mode:

```bash
npm run dev
npx evenhub-simulator http://localhost:5173
```

Telemetry is enabled in both dev and production builds, but logs stay on-device by default in a capped ring buffer stored through bridge local storage. Each server boot still creates `logs/session-<timestamp>.jsonl` when the Telemetry endpoint is explicitly set to `http://localhost:5173/__log`.

Live mode with nod gesture debug:

```bash
npx evenhub-simulator "http://localhost:5173/?nod=1"
```

Demo mode:

```bash
npm run demo
npm run simulator
```

Mocked demo mode without an API key:

```bash
npm run demo
npx evenhub-simulator "http://localhost:5173/?demo=1&mock=1"
```

Looping demo mode for capture:

```bash
npx evenhub-simulator "http://localhost:5173/?demo=1&loop=1"
```

Looping demo mode with nod gesture debug:

```bash
npx evenhub-simulator "http://localhost:5173/?demo=1&loop=1&nod=1"
```

The demo script bypasses ASR and injects transcript turns on a timeline so HINT, WORD, silence-triggered RECAP, and TTL-based quiet HUD reset all appear in the simulator even without glasses, a microphone, or an API key when `?mock=1` is set. The looping script now includes a Japanese hesitation fragment so the v2 intent-handling path can be exercised in demo mode as well.

## Nod Mode

- `?nod=1` enables nod gesture handling. Without this query parameter, IMU stays unused and nod actions are disabled by default.
- When enabled, the app calls `bridge.imuControl(true, 100)` and listens for `sysEvent.imuData {x,y,z}`. If the SDK build or simulator does not deliver IMU samples, nothing breaks; the app simply stays idle.
- A detected nod extends the currently visible card by `+4000ms`. If the HUD is quiet, the latest `RECAP` card is shown again.
- The WebView includes a Nod Debug panel with current pitch estimate, detect count, and status. Press `N` to simulate a nod in simulator or demo mode when IMU events are unavailable.

## Notes

- The Telemetry panel lets you disable recording, set an optional endpoint URL, export the current ring buffer as JSON, clear it, and inspect the current event count and approximate size.
- To inspect the latest captured session timeline, run:

```bash
npm run session:show
```

- To inspect an exported Telemetry JSON file instead of the latest dev-server session log, run:

```bash
node scripts/show-session.mjs /path/to/export.json
```

- The session viewer prints a readable timeline for `ASR -> coach decision -> HUD render/quiet`, plus recap-flow and nod events, then ends with latency and estimated-cost summaries.
- The dev server still exposes `POST /__log` only in development, and the panel shows `http://localhost:5173/__log` as a suggestion in dev, but nothing is sent unless that endpoint field is actually filled in.
- HUD layout is fixed to `TextContainer x3 + ImageContainer x1`.
- Text writes are throttled to `>=200ms`; hero image writes are throttled to `>=1000ms`.
- When a card TTL expires, the HUD returns to a quiet state and keeps the subtle `tap = help` hint visible on the aux line.
- Single tap forces a help request after a `400ms` double-tap guard window. Double-tap still exits through `bridge.shutDownPageContainer(1)`.
- The live transcription path batches short PCM windows into WAV and sends them to `POST /v1/audio/transcriptions` using `gpt-4o-mini-transcribe`, with up to `200` characters of recent conversation passed via the transcription `prompt` field for mixed Japanese/English context.
- ASR chunks are stored as role-unconfirmed utterances with `startedAt`, `endedAt`, and `gapBeforeMs`. Role attribution is delegated to the coach model, and the returned `attributed_roles` array is written into dev telemetry.
- The app no longer calls the intervention model on every chunk. It only requests help on these triggers: filler phrases, Japanese-mixed learner speech, local difficult-word hits for WORD, dangling-fragment silence (`>=1200ms`), question silence (`>=2500ms`), or an explicit tap.
- HINT cards render `1-3` numbered choices, each as `English (<=10 words) · Japanese label (3-8 chars)`. When the model marks `continuation: true`, each choice is prefixed with `…` to show that it continues the learner's in-progress sentence.
- High-frequency HINT/WORD intervention decisions use `gpt-5.6-luna`; silence-triggered RECAP generation uses `gpt-5.6`.
- HINT TTL is derived from choice count: `5000ms` for 1 choice, `5500ms` for 2 choices, `6000ms` for 3 choices.
- Before each ASR request, the app computes the PCM window RMS and drops windows below the VAD threshold instead of sending them upstream. The WebView shows current RMS, threshold, and whether the window was forwarded.
- Session state is mirrored into bridge local storage for recovery and also sent to background-session hooks when the runtime exposes `setBackgroundState` / `onBackgroundRestore`. On foreground return, transcript history, active mode, and the latest learning log are restored.
- Session end stores the latest RECAP in bridge local storage and the next launch shows that recap once before returning to quiet listening mode.
