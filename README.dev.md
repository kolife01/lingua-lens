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

Dev telemetry logs are written only while the Vite dev server is running. Each server boot creates `logs/session-<timestamp>.jsonl`.

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

The demo script bypasses ASR and injects transcript turns on a timeline so HINT, WORD, silence-triggered RECAP, and TTL-based quiet HUD reset all appear in the simulator even without glasses, a microphone, or an API key when `?mock=1` is set.

## Nod Mode

- `?nod=1` enables nod gesture handling. Without this query parameter, IMU stays unused and nod actions are disabled by default.
- When enabled, the app calls `bridge.imuControl(true, 100)` and listens for `sysEvent.imuData {x,y,z}`. If the SDK build or simulator does not deliver IMU samples, nothing breaks; the app simply stays idle.
- A detected nod extends the currently visible card by `+4000ms`. If the HUD is quiet, the latest `RECAP` card is shown again.
- The WebView includes a Nod Debug panel with current pitch estimate, detect count, and status. Press `N` to simulate a nod in simulator or demo mode when IMU events are unavailable.

## Notes

- The dev server exposes `POST /__log` only in development. The client logger is also dev-only, so production builds do not emit or include telemetry code paths.
- To inspect the latest captured session timeline, run:

```bash
npm run session:show
```

- The session viewer prints a readable timeline for `ASR -> coach decision -> HUD render/quiet`, plus recap-flow and nod events, then ends with latency and estimated-cost summaries.
- HUD layout is fixed to `TextContainer x3 + ImageContainer x1`.
- Text writes are throttled to `>=200ms`; hero image writes are throttled to `>=1000ms`.
- When a card TTL expires, the HUD returns to a quiet state with only the status line visible.
- Double-tap exits through `bridge.shutDownPageContainer(1)`.
- The live transcription path batches short PCM windows into WAV and sends them to `POST /v1/audio/transcriptions` using `gpt-4o-mini-transcribe`.
- HINT cards now render `1-3` numbered choices, each as `English (<=6 words) · Japanese label (3-8 chars)`. WORD and RECAP remain single-line cards.
- High-frequency HINT/WORD intervention decisions use `gpt-5.6-luna`; silence-triggered RECAP generation uses `gpt-5.6`.
- HINT TTL is derived from choice count: `5000ms` for 1 choice, `5500ms` for 2 choices, `6000ms` for 3 choices.
- Before each ASR request, the app computes the PCM window RMS and drops windows below the VAD threshold instead of sending them upstream. The WebView shows current RMS, threshold, and whether the window was forwarded.
- Session state is mirrored into bridge local storage for recovery and also sent to background-session hooks when the runtime exposes `setBackgroundState` / `onBackgroundRestore`. On foreground return, transcript history, active mode, and the latest learning log are restored.
- Session end stores the latest RECAP in bridge local storage and the next launch shows that recap once before returning to quiet listening mode.
