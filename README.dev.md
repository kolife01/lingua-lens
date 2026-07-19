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
npx evenhub-simulator "http://localhost:5173/?demo=1"
```

Mocked demo mode without an API key:

```bash
npm run demo
npx evenhub-simulator "http://localhost:5173/?demo=1&mock=1"
```

The demo script bypasses ASR and injects transcript turns on a timeline so HINT and WORD cards appear in the simulator HUD flow even without glasses or a microphone.

## Notes

- HUD layout is fixed to `TextContainer x3 + ImageContainer x1`.
- Text writes are throttled to `>=200ms`; hero image writes are throttled to `>=1000ms`.
- Double-tap exits through `bridge.shutDownPageContainer(1)`.
- The live transcription path batches short PCM windows into WAV and sends them to `POST /v1/audio/transcriptions`.
- `gpt-5.6` is used only for coaching decisions. When `?mock=1` is set or no API key is present in demo mode, coaching falls back to deterministic local rules.
