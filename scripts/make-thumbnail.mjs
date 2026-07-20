import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 800;
const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "docs/images");
const HUD_SOURCE = path.join(ROOT, "video/assets/hud-hint3-live.png");
const OUTPUT_A = path.join(OUTPUT_DIR, "devpost-thumbnail-a.png");
const OUTPUT_B = path.join(OUTPUT_DIR, "devpost-thumbnail-b.png");
const OUTPUT_FINAL = path.join(OUTPUT_DIR, "devpost-thumbnail.png");
const SELECTED_VARIANT = "a";

const palette = {
  bg: "#050806",
  bgLift: "#0d1410",
  green: "#8cff8a",
  greenHot: "#b8ff7a",
  greenDim: "#335b39",
  text: "#f3ffe9",
  textMuted: "#b8c9b3",
  frame: "#121915",
};

const hudBuffer = await fs.readFile(HUD_SOURCE);

function svgToBuffer(svg) {
  return Buffer.from(svg);
}

function dataUri(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function titleBlock({ x, y, width, align = "left" }) {
  const title = escapeHtml("LinguaLens");
  const lines = [
    "Full phrases when you're stuck.",
    "Silence when you're not.",
  ].map(escapeHtml);
  const anchor = align === "right" ? "end" : "start";

  return `
    <g transform="translate(${x} ${y})">
      <text
        x="0"
        y="0"
        fill="${palette.text}"
        font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="76"
        font-weight="700"
        letter-spacing="-1.8"
        text-anchor="${anchor}"
      >${title}</text>
      <text
        x="0"
        y="52"
        fill="${palette.textMuted}"
        font-family="'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        font-size="26"
        font-weight="500"
        letter-spacing="0.2"
        text-anchor="${anchor}"
      >
        <tspan x="0" dy="0">${lines[0]}</tspan>
        <tspan x="0" dy="32">${lines[1]}</tspan>
      </text>
      <rect x="${align === "right" ? -width : 0}" y="90" width="${width}" height="2" rx="1" fill="${palette.green}" opacity="0.5"/>
    </g>
  `;
}

function buildHudVariants(targetWidth) {
  const base = sharp(hudBuffer).resize({ width: targetWidth, kernel: sharp.kernel.nearest });

  return Promise.all([
    base.png().toBuffer(),
    base.clone().blur(8).modulate({ brightness: 1.25 }).png().toBuffer(),
    base.clone().blur(22).modulate({ brightness: 1.45 }).png().toBuffer(),
  ]);
}

function makeBackdropA() {
  return svgToBuffer(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.bgLift}"/>
          <stop offset="50%" stop-color="${palette.bg}"/>
          <stop offset="100%" stop-color="#020302"/>
        </linearGradient>
        <radialGradient id="glow" cx="62%" cy="42%" r="48%">
          <stop offset="0%" stop-color="${palette.green}" stop-opacity="0.22"/>
          <stop offset="35%" stop-color="${palette.green}" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="${palette.green}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette.greenHot}" stop-opacity="0"/>
          <stop offset="40%" stop-color="${palette.greenHot}" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="${palette.greenHot}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      <ellipse cx="770" cy="390" rx="390" ry="240" fill="${palette.green}" opacity="0.05"/>
      <ellipse cx="210" cy="690" rx="320" ry="160" fill="${palette.green}" opacity="0.045"/>
      <path d="M0 632 C215 592, 290 598, 482 650" fill="none" stroke="url(#beam)" stroke-width="2"/>
      <path d="M56 112 H324" stroke="${palette.green}" stroke-opacity="0.34" stroke-width="2"/>
      <path d="M888 672 H1144" stroke="${palette.green}" stroke-opacity="0.26" stroke-width="2"/>
      <circle cx="1088" cy="132" r="3" fill="${palette.green}" opacity="0.8"/>
      <circle cx="1020" cy="178" r="2" fill="${palette.green}" opacity="0.5"/>
      ${titleBlock({ x: 72, y: 110, width: 240 })}
    </svg>
  `);
}

function makeBackdropB() {
  return svgToBuffer(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stop-color="#0c120f"/>
          <stop offset="45%" stop-color="${palette.bg}"/>
          <stop offset="100%" stop-color="#020403"/>
        </linearGradient>
        <radialGradient id="ambient" cx="62%" cy="46%" r="44%">
          <stop offset="0%" stop-color="${palette.green}" stop-opacity="0.18"/>
          <stop offset="55%" stop-color="${palette.green}" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="${palette.green}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0d1511" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="#060906" stop-opacity="0.55"/>
        </linearGradient>
        <linearGradient id="frameGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.green}" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="${palette.green}" stop-opacity="0.04"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="url(#ambient)"/>
      <ellipse cx="360" cy="368" rx="260" ry="194" fill="url(#lens)" stroke="${palette.frame}" stroke-width="12"/>
      <ellipse cx="838" cy="368" rx="308" ry="210" fill="url(#lens)" stroke="${palette.frame}" stroke-width="12"/>
      <ellipse cx="360" cy="368" rx="252" ry="186" fill="none" stroke="url(#frameGlow)" stroke-width="2.5" opacity="0.5"/>
      <ellipse cx="838" cy="368" rx="300" ry="202" fill="none" stroke="url(#frameGlow)" stroke-width="2.5" opacity="0.5"/>
      <path d="M556 326 C590 308, 618 308, 652 326 L652 388 C621 406, 588 406, 556 388 Z" fill="#101612" stroke="${palette.frame}" stroke-width="7"/>
      <path d="M52 198 C126 136, 196 110, 270 114" fill="none" stroke="${palette.frame}" stroke-width="20" stroke-linecap="round"/>
      <path d="M934 114 C1008 110, 1078 136, 1148 198" fill="none" stroke="${palette.frame}" stroke-width="20" stroke-linecap="round"/>
      <ellipse cx="838" cy="370" rx="236" ry="160" fill="${palette.green}" opacity="0.04"/>
      <path d="M608 716 C622 666, 636 648, 660 628" fill="none" stroke="${palette.frame}" stroke-width="34" stroke-linecap="round" opacity="0.92"/>
      <path d="M492 720 C476 666, 462 650, 438 632" fill="none" stroke="${palette.frame}" stroke-width="34" stroke-linecap="round" opacity="0.88"/>
      <path d="M136 620 C238 594, 312 584, 418 598" fill="none" stroke="${palette.green}" stroke-width="2" stroke-opacity="0.14"/>
      <path d="M690 214 H1066" stroke="${palette.green}" stroke-opacity="0.18" stroke-width="1.5"/>
      ${titleBlock({ x: 74, y: 108, width: 240 })}
    </svg>
  `);
}

async function renderA() {
  const [hudMain, hudGlow, hudBloom] = await buildHudVariants(900);

  return sharp(makeBackdropA())
    .composite([
      { input: hudBloom, left: 388, top: 158, blend: "screen", opacity: 0.42 },
      { input: hudGlow, left: 404, top: 176, blend: "screen", opacity: 0.72 },
      { input: hudMain, left: 420, top: 192, blend: "screen" },
      {
        input: svgToBuffer(`
          <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <rect x="406" y="178" width="930" height="476" rx="28" fill="none" stroke="${palette.green}" stroke-opacity="0.16" stroke-width="2"/>
          </svg>
        `),
        left: 0,
        top: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function renderB() {
  const [hudMain, hudGlow, hudBloom] = await buildHudVariants(640);
  const hudData = dataUri(hudMain);
  const hudGlowData = dataUri(hudGlow);

  return sharp(makeBackdropB())
    .composite([
      { input: hudBloom, left: 576, top: 246, blend: "screen", opacity: 0.36 },
      {
        input: svgToBuffer(`
          <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
            <image href="${hudGlowData}" x="556" y="250" width="620" height="310" opacity="0.92"/>
            <image href="${hudData}" x="572" y="266" width="590" height="295"/>
            <path d="M586 250 C700 232, 826 230, 968 240" fill="none" stroke="${palette.green}" stroke-opacity="0.16" stroke-width="2"/>
            <path d="M970 572 C886 592, 786 600, 676 590" fill="none" stroke="${palette.green}" stroke-opacity="0.12" stroke-width="2"/>
          </svg>
        `),
        left: 0,
        top: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const [bufferA, bufferB] = await Promise.all([renderA(), renderB()]);
  await Promise.all([fs.writeFile(OUTPUT_A, bufferA), fs.writeFile(OUTPUT_B, bufferB)]);

  const finalBuffer = SELECTED_VARIANT === "b" ? bufferB : bufferA;
  await fs.writeFile(OUTPUT_FINAL, finalBuffer);

  for (const output of [OUTPUT_A, OUTPUT_B, OUTPUT_FINAL]) {
    const metadata = await sharp(output).metadata();
    const stat = await fs.stat(output);
    console.log(
      `${path.relative(ROOT, output)}: ${metadata.width}x${metadata.height}, ${(stat.size / 1024).toFixed(1)} KB`,
    );
  }
  console.log(`Selected variant: ${SELECTED_VARIANT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
