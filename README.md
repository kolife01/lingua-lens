# LinguaLens

LinguaLens is a real-time English conversation coach for Even G2 that shows short, glanceable hints on the glasses HUD without pulling the learner out of the conversation.

![LinguaLens HUD screenshot placeholder](docs/images/hud-screenshot-placeholder.png)

_Place the latest HUD screenshot in `docs/images/`._

## What It Is

LinguaLens listens to a live conversation, transcribes it, decides whether a coaching intervention is actually needed, and only then shows a short card on the Even G2 HUD.

Telemetry logs stay on the device by default and are only sent anywhere if the user explicitly sets a log endpoint.

## The Problem

This project came from the author's own practice routine with GPT-Live. In English conversation practice, the hard moment is not after the session. It is the exact second when you know what you want to say, but cannot phrase it fast enough.

Looking down at a phone breaks the conversation. It also breaks the learning moment. The goal here is to keep the learner's eyes up, preserve the flow, and still offer just enough help to keep speaking.

## How It Works

LinguaLens has one job: intervene quietly.

- `HINT`: when the speaker stalls, mixes in Japanese, or obviously searches for wording, the HUD shows `1-3` short English options. Each option includes a short Japanese label so the learner can pick meaning at a glance.
- `WORD`: when the partner says a difficult word, the HUD shows the word plus a very short plain-English paraphrase.
- `RECAP`: after a pause, the HUD shows one missed expression from the recent exchange for review.

The design rule is restraint. A silent HUD is a feature, not a failure. Every card is short enough to read in about two seconds, and the model is explicitly allowed to return `NONE`.

Text architecture:

```text
Even G2 mic
  -> 16 kHz PCM capture in the Even App WebView
  -> VAD-style RMS gate drops quiet windows locally
  -> OpenAI ASR: gpt-4o-mini-transcribe
  -> transcript window
  -> intervention judge: gpt-5.6-luna
       -> HINT | WORD | NONE
  -> silence-triggered recap generator: gpt-5.6
       -> RECAP
  -> HUD renderer
       -> TextContainer x3
       -> ImageContainer x1
       -> BLE-safe throttled updates
  -> mirrored desktop view in evenhub-simulator
```

Why the HUD stays simple:

- Even G2 BLE throughput makes image-heavy rendering expensive in practice, so the UI is mostly text.
- Text updates are throttled to `>=200ms`; hero image updates are throttled to `>=1000ms`.
- The page uses one fixed layout: `TextContainer x3 + ImageContainer x1`.
- That constraint pushed the product toward short choices, quiet resets, and minimal visual motion.

## Try It In 2 Minutes

### Simulator demo for judges

This path does not require glasses, a microphone, or an API key.

```bash
git clone <repo-url>
cd lingua-lens
npm install
npm run dev
```

In another terminal:

```bash
npm run simulator
```

`npm run simulator` opens the simulator against `http://localhost:5173/?demo=1`. If no API key is stored, the app automatically uses the mock coach path, so judges can watch the full scripted HUD flow immediately.

What the demo shows:

- scripted conversation turns injected on a timeline
- `HINT`, `WORD`, and silence-triggered `RECAP`
- TTL-based return to a quiet HUD state
- the same page structure used by the device app

For extra local notes, use [README.dev.md](/Users/kt/code/even-g2/apps/lingua-lens/README.dev.md).

### Run It On Even G2

For a live device run:

```bash
npm install
npm run dev
npm run build
npm run pack
```

Then sideload the generated package to Even G2 through the Even app QR flow, launch LinguaLens on the glasses, and enter an OpenAI API key once in the setup screen. After that, the key is stored in bridge local storage and the app boots straight into live listening mode.

## How We Used Codex & GPT-5.6

This project was implemented in Codex CLI sessions. The git history for July 19, 2026 explicitly records the implementation milestones as Codex-session work.

The split of labor was simple:

- the orchestrator handled specification, review, and verification
- Codex handled implementation in the working tree

The model split followed the runtime shape of the product, not branding:

- `gpt-4o-mini-transcribe` handles ASR because transcription is frequent and latency-sensitive.
- `gpt-5.6-luna` handles high-frequency intervention decisions because most transcript windows should resolve to `NONE`, `HINT`, or `WORD` cheaply.
- `gpt-5.6` handles `RECAP` generation because recap is less frequent and benefits from the stronger model.

The BLE budget mattered as much as the model budget. Because the glasses effectively reward very low-rate image updates, the product was designed backward from that constraint: one fixed HUD page, mostly text, short cards, and interventions that can be understood in a glance instead of richer visual UI.

## Roadmap

- integrate directly with GPT-Live practice mode once a public GPT-Live API exists
- replace the current batched pipeline with a `gpt-realtime` path for sub-second coaching
- expand recap review into a lightweight spaced repetition loop across sessions

## Timeline Evidence

This repository was started during the Submission Period on `2026-07-19`.

Relevant git history:

```text
9b164f4 2026-07-19 scaffold lingua-lens from asr template (Build Week entry)
2e29166 2026-07-19 lingua-lens M1: audio->ASR->GPT-5.6 coach->HUD pipeline with demo mode (implemented via Codex session)
1c44ad2 2026-07-19 lingua-lens M2: heartbeat-driven timers, cheap-model split (gpt-5.6-mini judge / gpt-5.6 recap), TTL-safe cards, looping demo (implemented via Codex sessions)
```

Those commits show a same-day new project start and implementation progress inside the allowed window.
