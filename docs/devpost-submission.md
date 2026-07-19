# Devpost Submission Draft — LinguaLens

Category: **Education** / Deadline: Jul 21 5:00pm PT (= Jul 22 9:00am JST)
Form fields prepared below. Paste-ready. (Video URL and repo URL to be filled on submission day.)

---

## Project name

LinguaLens

## Elevator pitch (tagline)

A quiet English coach that lives on your smart glasses — full phrases when you're stuck, silence when you're not.

## Text description (About the project)

### Inspiration

I practice English every day by talking with GPT-Live. And every day, the same thing happens: mid-sentence, I get stuck. The phrase I want is *right there*, but it won't come out. Looking at my phone to check a dictionary kills the conversation. By the time the conversation is over, I've even forgotten what I was stuck on. That learning moment just evaporates.

LinguaLens was built to catch exactly that moment — without breaking the conversation.

### What it does

LinguaLens runs on Even Realities G2 smart glasses. While you speak (with a person, or with GPT-Live), it listens through the glasses' microphone and shows small coaching cards on the HUD only when they help:

- **HINT** — when you stumble, it shows 1–3 complete, ready-to-say English phrases (≤6 words each) with a short native-language gloss. You pick one and say it. The conversation never stops.
- **WORD** — when the other side uses a difficult word, a 3-word plain-English gloss appears.
- **RECAP** — in a quiet moment, the phrase you *couldn't* say comes back as a review card. It returns again at your next session, so the moment becomes a lesson.

The core design value is **silence**: the model is explicitly allowed to decide "no intervention." A good coach knows when to stay quiet.

### How we built it

- **Everything was implemented through Codex CLI sessions** (session IDs available). A Claude-based orchestrator handled specs, review, and simulator verification; Codex wrote the code. The division of labor is documented in the README.
- **GPT-5.6 (sol)** generates RECAP phrases — the low-frequency, quality-critical work. **gpt-5.6-luna** makes the high-frequency intervene-or-stay-quiet decisions over a sliding 12-turn transcript window. **gpt-4o-mini-transcribe** handles ASR from the glasses' 16 kHz mic stream, gated by a client-side VAD so silent audio never hits the API.
- **BLE bandwidth is the design constraint**: the glasses' link sustains roughly 10–30 KB/s, so full-frame animation is impossible (~1 fps for images). LinguaLens is designed backwards from this: text-first cards, one hero image under 200×100 px updated at most once per second, and a single heartbeat driving all timing.

### Challenges we ran into

- The simulator virtualizes WebView timers, which silently froze multi-stage `setTimeout` chains. We rebuilt all timing (demo injection, card TTLs, silence detection) around a single 250 ms heartbeat with elapsed-time catch-up.
- Rate-limited HUD image updates could desynchronize the card text and its icon; we moved to an eventually-consistent pending-update model.
- Smart-glasses plugins are foreground-only with no audio output at all — which turned out to validate the product: a *visual, silent* coach is the only kind that can exist here.

### Accomplishments / What we learned

- A complete conversation-coaching loop (mic → ASR → judgment → HUD → review) running within a ~48 kbps sustained budget.
- Judges can try the full pipeline in ~2 minutes with **no hardware and no API key**: `npm run dev` + `npm run simulator` starts a scripted demo conversation (mock coach) in the official desktop simulator.
- Community-first: the G2 IMU's axes are undocumented ("TBD" even in the official FAQ); our flag-guarded nod-gesture experiment ships with a safe fallback.

### What's next

- **GPT-Live practice mode**: GPT-Live handles the voice conversation; LinguaLens coaches in your field of view — same HUD in practice and in real life. (Waiting on the GPT-Live API.)
- **gpt-realtime** streaming to cut hint latency to sub-second.
- Native-language glosses beyond Japanese via the SDK's user-country signal.

## Built with

`even-hub-sdk` · `gpt-5.6` · `gpt-5.6-luna` · `gpt-4o-mini-transcribe` · `codex-cli` · `typescript` · `vite` · `evenhub-simulator` · `remotion`

## Try it out (links)

- Repo: (fill: public GitHub URL)
- Demo video: (fill: YouTube URL)

## Submission-form extras

- **Codex /feedback session ID**: (fill on submission day — session where the majority of core functionality was built; candidates recorded under ~/.codex/sessions/2026/07/19/, pick the M1 core-pipeline session and verify via `codex resume` + `/feedback`)
- **Testing note for judges**: no hardware needed; simulator demo mode requires no API key. For live mode, set your OpenAI API key in the in-app setup screen.
