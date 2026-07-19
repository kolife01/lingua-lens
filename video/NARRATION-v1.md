# LinguaLens Demo Video — Narration v1 (GPT-Live premise, story-driven)

Target: <170s total. English narration (user voice preferred; TTS fallback).
Tone: first-person, honest, quiet confidence. No hype words ("revolutionary", "amazing").
Visual notes in [brackets]. Timing is a guide — cut to narration, not the other way around.

---

## COLD OPEN — the freeze (0:00–0:18)

[Black screen. Only a real conversation audio waveform. Then text subtitles of the dialogue.]

> **GPT-Live:** "So, what's blocking the release?"
> **Me:** "The login flow. Uh… I want say… えっと…"

[Beat of silence. Freeze the waveform.]

**NARRATION:**
"This is me, practicing English with GPT-Live. I do this every morning.
And every morning, I hit this exact wall."

## THE PROBLEM (0:18–0:40)

[Simple motion text over dark background.]

**NARRATION:**
"The phrase I need is *almost* there. But it won't come out.
If I stop to check my phone — the conversation dies.
If I just move on — the phrase I couldn't say is gone forever.
The best learning moment of my day… evaporates. Every single day."

## THE REVEAL (0:40–0:52)

[Even G2 glasses on desk. Slow push-in. Then: first-person view — the green HUD lights up in the corner of vision.]

**NARRATION:**
"So I built a coach that lives right here — in my field of view.
This is LinguaLens, on Even G2 smart glasses."

## CORE DEMO — same conversation, now with a coach (0:52–1:40)

[Replay the SAME conversation from the cold open. Split screen: left = HUD (real capture), right = conversation subtitles. The moment "Uh… I want say…" happens:]

[HUD shows:]
```
HINT
1 Could we push the deadline? · 締切延長
2 Friday is too tight. · 金曜厳しい
```

**NARRATION:**
"The moment I stumble, LinguaLens hears it — and hands me one to three complete phrases I can say *right now*, with a gloss in my own language.
I pick one. I say it. The conversation never stops."

[Continue: GPT-Live says "Is that timeline feasible?" → HUD: `WORD feasible = can do`]

**NARRATION:**
"When GPT-Live uses a word I don't know — a three-word gloss. That's all."

[Conversation pauses. Quiet beat. HUD: `RECAP — Try: I'm not sure how to explain the risk.`]

**NARRATION:**
"And in the quiet moments, the phrase I *couldn't* say comes back — as a review card. It shows up again tomorrow. The freeze becomes the lesson."

[HUD goes empty. Hold on the empty green screen for 2 seconds.]

**NARRATION:**
"Most of the time? It shows nothing. A good coach knows when to stay quiet."

## WHY GLASSES / HOW IT'S BUILT (1:40–2:20)

[Architecture: three clean diagram cards.]

**NARRATION:**
"Why glasses? A phone kills the conversation. Audio would talk over it. A silent HUD is the only interface that fits *inside* a conversation.
Every line of this app was written by Codex — I directed, Codex coded; the session logs are in the repo.
GPT-5.6 generates the review phrases. Its fastest sibling, luna, makes the stay-quiet-or-help call in real time. And the whole thing runs on a Bluetooth link so thin it forces honesty: text first, one image, nothing wasted."

## CLOSE (2:20–2:45)

[Repo page + simulator running side by side.]

**NARRATION:**
"You can try the full pipeline in two minutes — no glasses, no API key: the official simulator plays a scripted conversation, with the whole coaching loop live.
When the GPT-Live API opens, LinguaLens becomes its visual half: GPT-Live does the talking. LinguaLens does the catching.
LinguaLens. Full phrases when you're stuck. Silence when you're not."

[End card: LinguaLens — github.com/kolife01/lingua-lens — Built with Codex & GPT-5.6]

---

## Production notes

- Cold open reuses the demo script's own dialogue → shoot once, use twice (hook + demo)
- User voice recording: read NARRATION blocks only (~140 words, 2 min of speech). TTS fallback: say -v Ava
- All HUD shots = real simulator captures (576×288), shown inside a glasses-frame mock
- No BGM. Room tone or silence. The "quiet" brand should be audible.
- 日本語メモ: コールドオープンで「毎朝の実体験の詰まり」を最初の18秒で見せ、40秒で製品を明かす。機能列挙ではなく同じ会話のビフォー/アフター構造。「沈黙こそ機能」を映像でも2秒の空白HUDで見せる
