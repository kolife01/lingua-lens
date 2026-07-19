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

The demo script bypasses ASR and injects transcript turns on a timeline so HINT, WORD, silence-triggered RECAP, and TTL-based quiet HUD reset all appear in the simulator even without glasses, a microphone, or an API key when `?mock=1` is set.

## Notes

- HUD layout is fixed to `TextContainer x3 + ImageContainer x1`.
- Text writes are throttled to `>=200ms`; hero image writes are throttled to `>=1000ms`.
- When a card TTL expires, the HUD returns to a quiet state with only the status line visible.
- Double-tap exits through `bridge.shutDownPageContainer(1)`.
- The live transcription path batches short PCM windows into WAV and sends them to `POST /v1/audio/transcriptions` using `gpt-4o-mini-transcribe`.
- High-frequency HINT/WORD intervention decisions use `gpt-5.6-mini`; silence-triggered RECAP generation uses `gpt-5.6`.
- Session end stores the latest RECAP in bridge local storage and the next launch shows that recap once before returning to quiet listening mode.
