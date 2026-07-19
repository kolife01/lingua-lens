import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const fps = 30;
const durationSeconds = 165;

const scenes = [
  {id: 'title', start: 0, duration: 10},
  {id: 'problem', start: 10, duration: 30},
  {id: 'demo', start: 40, duration: 60},
  {id: 'build', start: 100, duration: 40},
  {id: 'closing', start: 140, duration: 25},
];

const narrationSections = [
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
];

const cwd = process.cwd();
const captionsPath = join(cwd, 'captions.srt');
const audioPath = join(cwd, 'public', 'narration.m4a');
const outputPath = join(cwd, 'out', 'draft-v0.mp4');

mkdirSync(join(cwd, 'out'), {recursive: true});

writeFileSync(captionsPath, buildCaptions().map(toSrtCue).join('\n\n') + '\n', 'utf8');

const filter = [
  `drawbox=x=0:y=0:w=iw:h=ih:color=#07110d:t=fill:enable='between(t,0,10)'`,
  `drawbox=x=0:y=0:w=iw:h=ih:color=#111912:t=fill:enable='between(t,10,40)'`,
  `drawbox=x=0:y=0:w=iw:h=ih:color=#07110d:t=fill:enable='between(t,40,100)'`,
  `drawbox=x=0:y=0:w=iw:h=ih:color=#10141f:t=fill:enable='between(t,100,140)'`,
  `drawbox=x=0:y=0:w=iw:h=ih:color=#14130c:t=fill:enable='between(t,140,165)'`,

  text('LINGUALENS', 110, 170, 130, '#f4f7f1', 0, 10),
  text('a quiet English coach on your glasses', 116, 320, 54, '#d8f6ea', 0, 10),
  text('Real-time conversation support without a phone lookup.', 120, 412, 34, '#9cb5a8', 0, 10),
  `drawbox=x=1020:y=140:w=680:h=400:color=#c6d8cf:t=16:enable='between(t,0,10)'`,
  `drawbox=x=1145:y=250:w=430:h=240:color=#050b07:t=fill:enable='between(t,0,10)'`,
  text('HINT', 1190, 286, 36, '#93ff57', 0, 10),
  text('Could we push the deadline?  締切延長', 1190, 350, 22, '#93ff57', 0, 10),
  text('Friday is too tight.  金曜厳しい', 1190, 388, 22, '#93ff57', 0, 10),
  text('We need more time.  時間必要', 1190, 426, 22, '#93ff57', 0, 10),

  text('PROBLEM', 96, 70, 32, '#93ff57', 10, 40),
  text('Conversation breaks at the worst moment', 96, 128, 60, '#f4f7f1', 10, 40),
  text('Idea is clear', 126, 352, 34, '#78ffbf', 10, 40),
  text('English phrasing stalls', 126, 438, 34, '#ffe48b', 10, 40),
  text('Phone lookup breaks eye contact', 126, 524, 34, '#ff9e7d', 10, 40),
  text('Learning moment disappears', 126, 610, 34, '#ff9e7d', 10, 40),
  `drawbox=x=1200:y=250:w=480:h=670:color=#0c1110:t=fill:enable='between(t,10,40)'`,
  `drawbox=x=1260:y=310:w=360:h=540:color=#161e1b:t=4:enable='between(t,10,40)'`,
  text('Search for English phrase...', 1300, 380, 24, '#cdd7d1', 10, 40),
  text('eyes down', 1340, 484, 34, '#7f978b', 10, 40),
  text('turn lost', 1340, 540, 34, '#7f978b', 10, 40),
  text('silence grows', 1296, 596, 34, '#7f978b', 10, 40),

  text('CORE DEMO', 84, 70, 32, '#93ff57', 40, 100),
  `drawbox=x=84:y=120:w=620:h=760:color=#111d18:t=fill:enable='between(t,40,100)'`,
  text('Them  We need to iterate on the prototype.', 110, 180, 24, '#eef6f2', 40, 100),
  text('You   Uh, I want say... we need more time.', 110, 272, 24, '#eef6f2', 40, 100),
  text('Them  Is Friday a feasible deadline?', 110, 364, 24, '#eef6f2', 40, 100),
  text('You   Friday is too tight for us.', 110, 456, 24, '#eef6f2', 40, 100),
  text('Them  Which part is blocked?', 110, 548, 24, '#eef6f2', 40, 100),
  text('You   The login flow and the risk.', 110, 640, 24, '#eef6f2', 40, 100),
  `drawbox=x=760:y=120:w=1076:h=760:color=#101814:t=fill:enable='between(t,40,100)'`,
  `drawbox=x=808:y=170:w=980:h=660:color=#09110d:t=10:enable='between(t,40,100)'`,
  `drawbox=x=1010:y=360:w=622:h=311:color=#030805:t=fill:enable='between(t,40,100)'`,
  `drawbox=x=1010:y=360:w=622:h=311:color=#4cae2a:t=2:enable='between(t,40,100)'`,
  text('HINT', 1060, 396, 28, '#93ff57', 40, 67),
  text('Could we push the deadline?  締切延長', 1084, 462, 20, '#93ff57', 40, 67),
  text('Friday is too tight.  金曜厳しい', 1084, 498, 20, '#93ff57', 40, 67),
  text('We need more time.  時間必要', 1084, 534, 20, '#93ff57', 40, 67),
  text('WORD', 1060, 396, 28, '#93ff57', 67, 78),
  text('stakeholder', 1084, 470, 26, '#93ff57', 67, 78),
  text('decision maker', 1084, 512, 22, '#93ff57', 67, 78),
  text('LISTEN', 1060, 396, 28, '#93ff57', 78, 87),
  text('quiet HUD', 1084, 470, 26, '#93ff57', 78, 87),
  text('no intervention', 1084, 512, 22, '#93ff57', 78, 87),
  text('RECAP', 1060, 396, 28, '#93ff57', 87, 100),
  text('one more round of user testing', 1084, 486, 22, '#93ff57', 87, 100),
  text('576 x 288 monochrome HUD', 860, 800, 20, '#96b6a7', 40, 100),

  text('HOW WE BUILT IT', 90, 70, 32, '#93ff57', 100, 140),
  text('Codex built end to end', 90, 128, 58, '#f4f7f1', 100, 140),
  text('GPT-5.6  recap generation', 118, 250, 28, '#eef6f2', 100, 140),
  text('gpt-5.6-luna  high-frequency judge', 118, 348, 28, '#eef6f2', 100, 140),
  text('gpt-4o-mini-transcribe  ASR', 118, 446, 28, '#eef6f2', 100, 140),
  text('BLE bandwidth forced a text-first HUD', 118, 544, 28, '#eef6f2', 100, 140),
  text('Even G2 mic', 1080, 202, 26, '#e3f3ea', 100, 140),
  text('16 kHz PCM capture', 1080, 274, 26, '#e3f3ea', 100, 140),
  text('transcript window', 1080, 346, 26, '#e3f3ea', 100, 140),
  text('gpt-5.6-luna judge', 1080, 418, 26, '#e3f3ea', 100, 140),
  text('gpt-5.6 recap', 1080, 490, 26, '#e3f3ea', 100, 140),
  text('HUD renderer', 1080, 562, 26, '#e3f3ea', 100, 140),

  text('CLOSING', 90, 70, 32, '#93ff57', 140, 165),
  text('Judges can try it now', 90, 128, 64, '#f4f7f1', 140, 165),
  text('simulator support  plus  demo mode', 98, 220, 34, '#9cb5a8', 140, 165),
  text('npm run demo', 120, 333, 28, '#e3f3ea', 140, 165),
  text('npm run simulator', 120, 421, 28, '#e3f3ea', 140, 165),
  text('looped scripted HUD flow', 120, 509, 28, '#e3f3ea', 140, 165),
  text('Roadmap  GPT-Live practice mode integration', 96, 622, 38, '#f0f6a5', 140, 165),
  `drawbox=x=1030:y=190:w=720:h=560:color=#18160f:t=fill:enable='between(t,140,165)'`,
  text('localhost 5173 ?demo=1&loop=1', 1070, 240, 24, '#9cb5a8', 140, 165),
  `drawbox=x=1090:y=350:w=580:h=280:color=#030805:t=fill:enable='between(t,140,165)'`,
  `drawbox=x=1090:y=350:w=580:h=280:color=#4cae2a:t=2:enable='between(t,140,165)'`,
  text('RECAP', 1140, 392, 28, '#93ff57', 140, 165),
  text('one more round of user testing', 1170, 460, 22, '#93ff57', 140, 165),

  text('1920x1080  30fps  no BGM', 90, 1018, 18, '#7d9588', 0, 165),
  text('LinguaLens demo draft v0', 1600, 1018, 18, '#7d9588', 0, 165),
  `subtitles=${escapePath(captionsPath)}:force_style='FontName=Helvetica,FontSize=22,PrimaryColour=&H00F7FAF6,OutlineColour=&H64000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=28,Alignment=2'`,
].join(',');

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=#050907:s=1920x1080:r=${fps}:d=${durationSeconds}`,
    '-i',
    audioPath,
    '-vf',
    filter,
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-shortest',
    outputPath,
  ],
  {stdio: 'inherit'},
);

function text(value, x, y, size, color, start, end) {
  return `drawtext=font=Helvetica:text='${escapeText(value)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:enable='between(t,${start},${end})'`;
}

function buildCaptions() {
  return narrationSections
    .flatMap((section) => {
      const scene = scenes.find((item) => item.id === section.sceneId);
      const sectionStart = scene.start * fps;
      const sectionFrames = scene.duration * fps;
      const weights = section.sentences.map((sentence) => sentence.trim().split(/\s+/).length);
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      let cursor = sectionStart;
      return section.sentences.map((sentence, index) => {
        const remainingFrames = sectionStart + sectionFrames - cursor;
        const frames =
          index === section.sentences.length - 1
            ? remainingFrames
            : Math.max(45, Math.round((sectionFrames * weights[index]) / totalWeight));
        const cue = {
          index: 0,
          startFrame: cursor,
          endFrame: Math.min(sectionStart + sectionFrames, cursor + frames),
          text: sentence,
        };
        cursor = cue.endFrame;
        return cue;
      });
    })
    .map((cue, index) => ({...cue, index: index + 1}));
}

function toSrtCue(cue) {
  return `${cue.index}\n${formatTime(cue.startFrame / fps)} --> ${formatTime(cue.endFrame / fps)}\n${cue.text}`;
}

function formatTime(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\\\'")
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function escapePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/,/g, '\\,');
}
