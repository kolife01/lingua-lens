export const fps = 30;

export const SCENES = [
  {id: 'cold-open', start: 0, duration: 18, label: 'Cold Open'},
  {id: 'problem', start: 18, duration: 22, label: 'Problem'},
  {id: 'reveal', start: 40, duration: 12, label: 'Reveal'},
  {id: 'core-demo', start: 52, duration: 48, label: 'Core Demo'},
  {id: 'build', start: 100, duration: 40, label: 'How It Is Built'},
  {id: 'close', start: 140, duration: 25, label: 'Close'},
] as const;

export const totalSeconds = SCENES[SCENES.length - 1]!.start + SCENES[SCENES.length - 1]!.duration;

export const NARRATION_SECTIONS = [
  {
    sceneId: 'cold-open',
    sentences: [
      'This is me, practicing English with GPT-Live.',
      'I do this every morning.',
      'And every morning, I hit this exact wall.',
    ],
  },
  {
    sceneId: 'problem',
    sentences: [
      'The phrase I need is almost there.',
      "But it won't come out.",
      'If I stop to check my phone, the conversation dies.',
      "If I just move on, the phrase I couldn't say is gone forever.",
      'The best learning moment of my day evaporates.',
      'Every single day.',
    ],
  },
  {
    sceneId: 'reveal',
    sentences: [
      'So I built a coach that lives right here, in my field of view.',
      'This is LinguaLens, on Even G2 smart glasses.',
    ],
  },
  {
    sceneId: 'core-demo',
    sentences: [
      'The moment I stumble, LinguaLens hears it and hands me one to three complete phrases I can say right now, with a gloss in my own language.',
      'I pick one.',
      'I say it.',
      'The conversation never stops.',
      "When GPT-Live uses a word I don't know, a three-word gloss.",
      "That's all.",
      "And in the quiet moments, the phrase I couldn't say comes back as a review card.",
      'It shows up again tomorrow.',
      'The freeze becomes the lesson.',
      'Most of the time, it shows nothing.',
      'A good coach knows when to stay quiet.',
    ],
  },
  {
    sceneId: 'build',
    sentences: [
      'Why glasses?',
      'A phone kills the conversation.',
      'Audio would talk over it.',
      'A silent HUD is the only interface that fits inside a conversation.',
      'Every line of this app was written by Codex.',
      'I directed, Codex coded.',
      'The session logs are in the repo.',
      'GPT-5.6 generates the review phrases.',
      'Its fastest sibling, luna, makes the stay-quiet-or-help call in real time.',
      'And the whole thing runs on a Bluetooth link so thin it forces honesty: text first, one image, nothing wasted.',
    ],
  },
  {
    sceneId: 'close',
    sentences: [
      'You can try the full pipeline in two minutes, no glasses, no API key: the official simulator plays a scripted conversation, with the whole coaching loop live.',
      'When the GPT-Live API opens, LinguaLens becomes its visual half.',
      'GPT-Live does the talking.',
      'LinguaLens does the catching.',
      "LinguaLens. Full phrases when you're stuck. Silence when you're not.",
    ],
  },
] as const;

export const DIALOGUE_LINES = [
  {speaker: 'GPT-Live', text: "So, what's blocking the release?"},
  {speaker: 'Me', text: 'The login flow. Uh... I want say... えっと...'},
  {speaker: 'GPT-Live', text: 'Is that timeline feasible?'},
  {speaker: 'Me', text: "Friday is too tight. We need more time before the review."},
  {speaker: 'GPT-Live', text: 'Which part of the risk is hardest to explain?'},
  {speaker: 'Me', text: "I'm not sure how to explain the risk."},
] as const;

export const AUDIO_FILES = [
  'audio/narration-01.m4a',
  'audio/narration-02.m4a',
  'audio/narration-03.m4a',
  'audio/narration-04.m4a',
  'audio/narration-05.m4a',
  'audio/narration-06.m4a',
] as const;
