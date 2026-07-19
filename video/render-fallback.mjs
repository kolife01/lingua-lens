import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const fps = 30;
const width = 1920;
const height = 1080;
const durationSeconds = 165;

const sceneDurations = [18, 22, 12, 22, 12, 12, 2, 40, 17, 8];
const audioOffsetsMs = [0, 18000, 40000, 52000, 100000, 140000];

const narrationSections = [
  {
    sceneStart: 0,
    sceneDuration: 18,
    sentences: [
      'This is me, practicing English with GPT-Live.',
      'I do this every morning.',
      'And every morning, I hit this exact wall.',
    ],
  },
  {
    sceneStart: 18,
    sceneDuration: 22,
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
    sceneStart: 40,
    sceneDuration: 12,
    sentences: [
      'So I built a coach that lives right here, in my field of view.',
      'This is LinguaLens, on Even G2 smart glasses.',
    ],
  },
  {
    sceneStart: 52,
    sceneDuration: 48,
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
    sceneStart: 100,
    sceneDuration: 40,
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
    sceneStart: 140,
    sceneDuration: 25,
    sentences: [
      'You can try the full pipeline in two minutes, no glasses, no API key: the official simulator plays a scripted conversation, with the whole coaching loop live.',
      'When the GPT-Live API opens, LinguaLens becomes its visual half.',
      'GPT-Live does the talking.',
      'LinguaLens does the catching.',
      "LinguaLens. Full phrases when you're stuck. Silence when you're not.",
    ],
  },
];

const cwd = process.cwd();
const tmpDir = join(cwd, 'out', 'fallback-v1-temp');
const captionsPath = join(cwd, 'captions.srt');
const outputPath = join(cwd, 'out', 'draft-v1.mp4');
mkdirSync(tmpDir, {recursive: true});

writeFileSync(captionsPath, buildCaptions().map(toSrtCue).join('\n\n') + '\n', 'utf8');

const hud = (name) => `file://${join(cwd, 'public', 'hud', name)}`;
const images = [
  ['scene-01.png', coldOpenSvg()],
  ['scene-02.png', problemSvg()],
  ['scene-03.png', revealSvg(hud('hud-1.png'))],
  ['scene-04.png', coreDemoSvg(hud('hud-1.png'), 'HINT', 'One to three full phrases, right when the sentence stalls.')],
  ['scene-05.png', coreDemoSvg(hud('hud-3.png'), 'WORD', 'A three-word gloss when GPT-Live says something new.')],
  ['scene-06.png', coreDemoSvg(hud('hud-5.png'), 'RECAP', "The phrase that froze comes back after the pressure passes.")],
  ['scene-07.png', coreDemoSvg(hud('hud-6.png'), 'QUIET', 'A good coach knows when to stay silent.')],
  ['scene-08.png', buildSvg()],
  ['scene-09.png', closeSvg(hud('hud-5.png'))],
  ['scene-10.png', endCardSvg()],
];

for (const [fileName, svg] of images) {
  const svgPath = join(tmpDir, fileName.replace('.png', '.svg'));
  const pngPath = join(tmpDir, fileName);
  writeFileSync(svgPath, svg, 'utf8');
  execFileSync('rsvg-convert', ['-w', String(width), '-h', String(height), '-o', pngPath, svgPath], {stdio: 'inherit'});
}

const imageInputs = images.map(([fileName], index) => [
  '-loop',
  '1',
  '-t',
  String(sceneDurations[index]),
  '-i',
  join(tmpDir, fileName),
]).flat();

const concatInputs = images.map((_, index) => `[${index}:v]`).join('');
const audioStart = images.length + 1;
const filter = [
  `${concatInputs}concat=n=${images.length}:v=1:a=0[basev]`,
  `[${audioStart}:a]adelay=${audioOffsetsMs[0]}|${audioOffsetsMs[0]}[a1]`,
  `[${audioStart + 1}:a]adelay=${audioOffsetsMs[1]}|${audioOffsetsMs[1]}[a2]`,
  `[${audioStart + 2}:a]adelay=${audioOffsetsMs[2]}|${audioOffsetsMs[2]}[a3]`,
  `[${audioStart + 3}:a]adelay=${audioOffsetsMs[3]}|${audioOffsetsMs[3]}[a4]`,
  `[${audioStart + 4}:a]adelay=${audioOffsetsMs[4]}|${audioOffsetsMs[4]}[a5]`,
  `[${audioStart + 5}:a]adelay=${audioOffsetsMs[5]}|${audioOffsetsMs[5]}[a6]`,
  `[${images.length}:a][a1][a2][a3][a4][a5][a6]amix=inputs=7:duration=longest:normalize=0[a]`,
  `[basev]subtitles='${escapePath(captionsPath)}'[v]`,
].join(';');

execFileSync(
  'ffmpeg',
  [
    '-y',
    ...imageInputs,
    '-f',
    'lavfi',
    '-t',
    String(durationSeconds),
    '-i',
    'anullsrc=channel_layout=mono:sample_rate=22050',
    '-i',
    join(cwd, 'public', 'audio', 'narration-01.m4a'),
    '-i',
    join(cwd, 'public', 'audio', 'narration-02.m4a'),
    '-i',
    join(cwd, 'public', 'audio', 'narration-03.m4a'),
    '-i',
    join(cwd, 'public', 'audio', 'narration-04.m4a'),
    '-i',
    join(cwd, 'public', 'audio', 'narration-05.m4a'),
    '-i',
    join(cwd, 'public', 'audio', 'narration-06.m4a'),
    '-filter_complex',
    filter,
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-r',
    String(fps),
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(durationSeconds),
    outputPath,
  ],
  {stdio: 'inherit'},
);

function coldOpenSvg() {
  const bars = new Array(18)
    .fill(null)
    .map((_, index) => {
      const x = 260 + index * 78;
      const h = [180, 120, 210, 90, 240, 140][index % 6];
      return rect(x, 350 - h / 2, 28, h, '#92ff5b', 1);
    })
    .join('');
  return svg(`
    <rect width="1920" height="1080" fill="#000000"/>
    <text x="110" y="90" ${mono(24, '#88948d')}>COLD OPEN</text>
    ${bars}
    ${panel(110, 660, 1700, 250)}
    <text x="160" y="720" ${sans(34, '#eef6f2')}>GPT-Live    So, what's blocking the release?</text>
    <text x="160" y="795" ${sans(42, '#92ff5b', 700)}>Me          The login flow. Uh... I want say... えっと...</text>
    <text x="1510" y="96" ${mono(22, '#ffe58d')}>freeze detected</text>
  `);
}

function problemSvg() {
  return svg(`
    <rect width="1920" height="1080" fill="#070a08"/>
    <text x="110" y="90" ${mono(24, '#92ff5b')}>THE PROBLEM</text>
    <text x="110" y="176" ${sans(72, '#f4f7f1', 700)}>The best learning</text>
    <text x="110" y="258" ${sans(72, '#f4f7f1', 700)}>moment disappears</text>
    <text x="110" y="340" ${sans(72, '#f4f7f1', 700)}>in real time.</text>
    ${pill(120, 390, 760, 72, 'The phrase is almost there.')}
    ${pill(120, 485, 760, 72, 'Looking down kills the exchange.')}
    ${pill(120, 580, 760, 72, 'Moving on erases the lesson.')}
    ${panel(1120, 300, 620, 470)}
    <text x="1180" y="375" ${sans(34, '#f4f7f1', 700)}>Phone lookup</text>
    <text x="1230" y="470" ${sans(30, '#99aa9f')}>eyes down</text>
    <text x="1230" y="530" ${sans(30, '#99aa9f')}>timing lost</text>
    <text x="1230" y="590" ${sans(30, '#99aa9f')}>lesson gone</text>
  `);
}

function revealSvg(hudHref) {
  return svg(`
    <rect width="1920" height="1080" fill="#060907"/>
    <text x="110" y="90" ${mono(24, '#92ff5b')}>REVEAL</text>
    <text x="110" y="190" ${sans(102, '#f4f7f1', 700)}>LinguaLens</text>
    <text x="116" y="276" ${sans(36, '#d8efe0')}>a coach that stays inside the conversation</text>
    ${glasses(900, 220, 820, 460)}
    <image href="${hudHref}" x="1090" y="320" width="440" height="220" preserveAspectRatio="none"/>
  `);
}

function coreDemoSvg(hudHref, tag, blurb) {
  return svg(`
    <rect width="1920" height="1080" fill="#050705"/>
    <text x="110" y="90" ${mono(24, '#92ff5b')}>CORE DEMO</text>
    ${panel(90, 170, 860, 700)}
    ${panel(1010, 170, 820, 700)}
    <text x="136" y="212" ${mono(20, '#99aa9f')}>left  HUD playback</text>
    <text x="1056" y="212" ${mono(20, '#99aa9f')}>right  conversation subtitles</text>
    ${glasses(104, 250, 832, 540)}
    <image href="${hudHref}" x="180" y="310" width="680" height="340" preserveAspectRatio="none"/>
    ${tagChip(140, 760, tag)}
    <text x="140" y="840" ${sans(24, '#d6e2db')}>${escapeXml(blurb)}</text>
    ${chat(1040, 270, 'GPT-Live', "So, what's blocking the release?")}
    ${chat(1040, 360, 'Me', 'The login flow. Uh... I want say... えっと...', true)}
    ${chat(1040, 490, 'GPT-Live', 'Is that timeline feasible?')}
    ${chat(1040, 580, 'Me', 'Friday is too tight. We need more time before the review.')}
    ${chat(1040, 710, 'GPT-Live', 'Which part of the risk is hardest to explain?')}
    ${chat(1040, 800, 'Me', "I'm not sure how to explain the risk.")}
  `);
}

function buildSvg() {
  return svg(`
    <rect width="1920" height="1080" fill="#07090a"/>
    <text x="110" y="90" ${mono(24, '#92ff5b')}>WHY GLASSES / HOW IT'S BUILT</text>
    ${card(90, 180, 540, 320, 'Why this interface', ['A phone kills the conversation.', 'Audio would talk over it.', 'A silent HUD fits inside the turn.'])}
    ${card(690, 180, 540, 320, 'Codex + models', ['Codex wrote the app.', 'GPT-5.6 writes RECAP.', 'luna decides help or silence.'])}
    ${card(1290, 180, 540, 320, 'BLE honesty', ['Text first.', 'One image.', 'Nothing wasted.'])}
    ${panel(90, 560, 930, 250)}
    <text x="126" y="674" ${sans(30, '#e5fbe9')}>Mic  →  ASR  →  Window  →  Judge  →  Hint/Word  →  Recap  →  HUD</text>
    ${panel(1080, 560, 750, 250)}
    <text x="1120" y="640" ${mono(28, '#92ff5b')}>session-logs/codex-*.md</text>
    <text x="1120" y="700" ${mono(28, '#eef6f2')}>apps/lingua-lens</text>
    <text x="1120" y="760" ${mono(28, '#eef6f2')}>video/NARRATION-v1.md</text>
  `);
}

function closeSvg(hudHref) {
  return svg(`
    <rect width="1920" height="1080" fill="#060707"/>
    <text x="110" y="90" ${mono(24, '#92ff5b')}>CLOSE</text>
    ${panel(90, 180, 860, 650)}
    ${panel(990, 180, 840, 650)}
    <text x="136" y="226" ${mono(20, '#99aa9f')}>repository</text>
    <text x="1036" y="226" ${mono(20, '#99aa9f')}>official simulator</text>
    <text x="140" y="300" ${sans(34, '#f4f7f1', 700)}>github.com/kolife01/lingua-lens</text>
    <text x="140" y="390" ${mono(28, '#92ff5b')}>README.md</text>
    <text x="140" y="450" ${mono(28, '#eef6f2')}>apps/lingua-lens</text>
    <text x="140" y="510" ${mono(28, '#eef6f2')}>video/</text>
    <text x="140" y="570" ${mono(28, '#eef6f2')}>session-logs/</text>
    <text x="1036" y="300" ${sans(32, '#f4f7f1', 700)}>localhost:5173/simulator</text>
    <text x="1036" y="360" ${sans(28, '#99aa9f')}>no glasses, no API key</text>
    <image href="${hudHref}" x="1200" y="420" width="520" height="260" preserveAspectRatio="none"/>
  `);
}

function endCardSvg() {
  return svg(`
    <rect width="1920" height="1080" fill="#040505"/>
    ${panel(260, 250, 1400, 560)}
    <text x="620" y="430" ${sans(108, '#f4f7f1', 700)}>LinguaLens</text>
    <text x="420" y="530" ${sans(38, '#d8efe0')}>Full phrases when you're stuck. Silence when you're not.</text>
    <text x="610" y="610" ${mono(28, '#92ff5b')}>github.com/kolife01/lingua-lens</text>
    <text x="700" y="668" ${sans(24, '#99aa9f')}>Built with Codex and GPT-5.6</text>
  `);
}

function svg(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${inner}
  </svg>`;
}

function panel(x, y, w, h) {
  return rect(x, y, w, h, '#0d1210', 0.94);
}

function rect(x, y, w, h, fill, opacity = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" ry="26" fill="${fill}" fill-opacity="${opacity}"/>`;
}

function pill(x, y, w, h, label) {
  return `${rect(x, y, w, h, '#151b18', 1)}<text x="${x + 24}" y="${y + 46}" ${sans(30, '#f4f7f1')}>${escapeXml(label)}</text>`;
}

function glasses(x, y, w, h) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="230" ry="230" fill="none" stroke="#cfd9d3" stroke-width="10"/>
    <rect x="${x - 30}" y="${y + h / 2 - 8}" width="120" height="16" rx="8" fill="#cfd9d3"/>
    <rect x="${x + w - 90}" y="${y + h / 2 - 8}" width="120" height="16" rx="8" fill="#cfd9d3"/>
  `;
}

function tagChip(x, y, label) {
  return `
    <rect x="${x}" y="${y}" width="160" height="52" rx="26" fill="#111613" stroke="#92ff5b" stroke-width="2"/>
    <text x="${x + 28}" y="${y + 34}" ${mono(26, '#92ff5b')}>${escapeXml(label)}</text>
  `;
}

function chat(x, y, speaker, line, active = false) {
  const h = speaker === 'Me' ? 104 : 74;
  const lineColor = active ? '#92ff5b' : '#eef6f2';
  return `
    ${rect(x, y, 700, h, active ? '#18231a' : '#111613', 1)}
    <text x="${x + 18}" y="${y + 22}" ${mono(18, '#99aa9f')}>${escapeXml(speaker)}</text>
    <text x="${x + 18}" y="${y + 52}" ${sans(26, lineColor)}>${escapeXml(line)}</text>
  `;
}

function card(x, y, w, h, title, lines) {
  return `
    ${panel(x, y, w, h)}
    <text x="${x + 28}" y="${y + 46}" ${sans(34, '#f4f7f1', 700)}>${escapeXml(title)}</text>
    ${lines
      .map(
        (line, index) => `
          ${rect(x + 20, y + 90 + index * 70, w - 40, 52, '#151c18', 1)}
          <text x="${x + 40}" y="${y + 125 + index * 70}" ${sans(24, '#eef6f2')}>${escapeXml(line)}</text>
        `,
      )
      .join('')}
  `;
}

function mono(size, color) {
  return `font-family="Menlo, Monaco, monospace" font-size="${size}" fill="${color}"`;
}

function sans(size, color, weight = 500) {
  return `font-family="'Avenir Next', Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}"`;
}

function buildCaptions() {
  return narrationSections
    .flatMap((section) => {
      const sectionStart = section.sceneStart * fps;
      const sectionFrames = section.sceneDuration * fps;
      const weights = section.sentences.map((sentence) => Math.max(3, sentence.trim().split(/\s+/).length));
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      let cursor = sectionStart;
      return section.sentences.map((sentence, index) => {
        const remainingFrames = sectionStart + sectionFrames - cursor;
        const frames =
          index === section.sentences.length - 1
            ? remainingFrames
            : Math.max(30, Math.round((sectionFrames * weights[index]) / totalWeight));
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
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapePath(value) {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
}
