export const fps = 30;

export const SCENES = [
  {id: 'title', start: 0, duration: 10},
  {id: 'problem', start: 10, duration: 30},
  {id: 'demo', start: 40, duration: 60},
  {id: 'build', start: 100, duration: 40},
  {id: 'closing', start: 140, duration: 25},
] as const;

export const NARRATION_SECTIONS = [
  {
    sceneId: 'title',
    sentences: [
      'This is LinguaLens, a quiet English coach on your glasses.',
      'It helps in the hardest moment of conversation, the second when you want to keep speaking, but the words do not come out fast enough.',
    ],
  },
  {
    sceneId: 'problem',
    sentences: [
      'I practice spoken English every day with GPT-Live, because it gives me real back and forth pressure, not just textbook drills.',
      'The failure point is always the same.',
      'I know the idea, but I stall on the phrasing.',
      'If I look down at my phone to search for help, the conversation breaks immediately, and the learning moment is gone.',
      'That made me ask a simple question.',
      'What if the help stayed inside my line of sight, quiet enough to preserve the flow, but useful enough to keep me talking?',
    ],
  },
  {
    sceneId: 'demo',
    sentences: [
      'So LinguaLens listens through Even G2, transcribes the exchange, and decides whether to stay silent or intervene.',
      'The first card is HINT.',
      'When I hesitate, the HUD offers one to three short English options, each paired with a tiny Japanese meaning label, so I can choose intent at a glance and keep speaking.',
      'Next is WORD.',
      'If my partner says a difficult term, LinguaLens shows the word with a very short plain English paraphrase.',
      'Then comes silence.',
      'That quiet screen is not a bug.',
      'It is a product decision.',
      'The model is explicitly allowed to do nothing, because over coaching would be just another distraction.',
      'After a pause, LinguaLens brings back one missed expression as RECAP, so the conversation still turns into learning, even after the urgent moment has passed.',
      'The whole flow is designed to be readable in about two seconds on a tiny monochrome HUD.',
    ],
  },
  {
    sceneId: 'build',
    sentences: [
      'Here is how we built it.',
      'This codebase was implemented in Codex sessions from spec to working demo.',
      'For models, we split the job by frequency and cost.',
      'GPT-5.6 generates RECAP, where quality matters most.',
      'gpt-5.6-luna handles the high frequency intervention decisions, because most windows should resolve cheaply to hint, word, or none.',
      'gpt-4o-mini-transcribe handles speech recognition.',
      'The hardware constraint mattered just as much as the model choice.',
      'Bluetooth Low Energy bandwidth on the glasses pushed us toward one fixed page, mostly text, throttled updates, and a design that rewards restraint instead of visual noise.',
    ],
  },
  {
    sceneId: 'closing',
    sentences: [
      'For judging, LinguaLens already ships with simulator support and a demo mode, so you can try the full HUD flow without glasses, a microphone, or an API key.',
      'Next, I want to connect it even more tightly to GPT-Live practice mode, so the coaching loop becomes part of the daily speaking habit itself.',
      'LinguaLens is a small idea with a narrow scope, but it solves a very real moment for language learners.',
      'Thank you.',
    ],
  },
] as const;
