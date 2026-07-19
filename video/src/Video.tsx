import React from 'react';
import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {NARRATION_SECTIONS, SCENES} from './script';

type CaptionCue = {
  startFrame: number;
  endFrame: number;
  text: string;
};

type SceneWindow = (typeof SCENES)[number];

const palette = {
  text: '#f4f7f1',
  muted: '#98b4a6',
  accent: '#93ff57',
  accentSoft: '#78ffbf',
};

const frameGlow: React.CSSProperties = {
  border: '1px solid rgba(180,255,210,0.28)',
  boxShadow: '0 40px 120px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)',
  background: 'linear-gradient(180deg, rgba(16,29,24,0.95), rgba(8,16,13,0.98))',
  backdropFilter: 'blur(20px)',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif',
  fontWeight: 700,
  letterSpacing: '-0.04em',
  color: palette.text,
};

const bodyCopy: React.CSSProperties = {
  fontSize: 30,
  lineHeight: 1.48,
  color: palette.muted,
  margin: 0,
};

const buildBulletStyle: React.CSSProperties = {
  padding: '16px 18px',
  borderRadius: 18,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  color: palette.text,
  fontSize: 24,
  lineHeight: 1.35,
};

const pipeStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid rgba(147,255,87,0.22)',
  color: '#e3f3ea',
  background: 'rgba(147,255,87,0.05)',
  fontFamily: 'Menlo, monospace',
  fontSize: 22,
};

const captions = buildCaptions();

function buildCaptions(): CaptionCue[] {
  return NARRATION_SECTIONS.flatMap((section) => {
    const scene = SCENES.find((item) => item.id === section.sceneId)!;
    const sectionStart = scene.start * 30;
    const sectionFrames = scene.duration * 30;
    const weights = section.sentences.map((sentence) => sentence.trim().split(/\s+/).length);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    let cursor = sectionStart;
    return section.sentences.map((sentence, index) => {
      const remainingFrames = sectionStart + sectionFrames - cursor;
      const frames =
        index === section.sentences.length - 1
          ? remainingFrames
          : Math.max(45, Math.round((sectionFrames * weights[index]!) / totalWeight));
      const cue = {
        startFrame: cursor,
        endFrame: Math.min(sectionStart + sectionFrames, cursor + frames),
        text: sentence,
      };
      cursor = cue.endFrame;
      return cue;
    });
  });
}

const useSceneProgress = (scene: SceneWindow) => {
  const frame = useCurrentFrame();
  return Math.max(0, Math.min(1, (frame - scene.start * 30) / (scene.duration * 30)));
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 4950], [0, 1]);
  return (
    <AbsoluteFill
      style={{
        background:
          `radial-gradient(circle at ${20 + shift * 12}% ${18 + shift * 8}%, rgba(122,255,187,0.16), transparent 28%), ` +
          `radial-gradient(circle at ${78 - shift * 10}% ${78 - shift * 12}%, rgba(147,255,87,0.14), transparent 24%), ` +
          'linear-gradient(180deg, #030705 0%, #09120f 40%, #050907 100%)',
      }}
    />
  );
};

const SectionBadge: React.FC<{label: string}> = ({label}) => (
  <div
    style={{
      display: 'inline-flex',
      padding: '10px 16px',
      borderRadius: 999,
      border: '1px solid rgba(147,255,87,0.35)',
      color: palette.accent,
      fontFamily: 'Menlo, monospace',
      fontSize: 22,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      background: 'rgba(10,20,16,0.82)',
    }}
  >
    {label}
  </div>
);

const TitleScene: React.FC = () => {
  const scene = SCENES[0]!;
  const progress = useSceneProgress(scene);
  const rise = spring({fps: 30, frame: progress * scene.duration * 30, config: {damping: 16}});
  return (
    <AbsoluteFill style={{padding: '96px 112px', justifyContent: 'space-between'}}>
      <SectionBadge label="OpenAI Build Week demo draft v0" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          alignItems: 'center',
          gap: 48,
          transform: `translateY(${50 - rise * 50}px)`,
          opacity: rise,
        }}
      >
        <div>
          <div style={{...titleStyle, fontSize: 104, lineHeight: 0.92}}>LinguaLens</div>
          <div style={{...titleStyle, fontSize: 52, lineHeight: 1.08, marginTop: 20, color: '#d8f6ea'}}>
            a quiet English coach on your glasses
          </div>
          <p style={{...bodyCopy, marginTop: 36, maxWidth: 760}}>
            Real-time conversation support for the exact second when phrasing stalls and looking at a phone would
            break the exchange.
          </p>
        </div>
        <GlassesHero />
      </div>
      <FooterMeta />
    </AbsoluteFill>
  );
};

const GlassesHero: React.FC = () => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 24) * 8;
  return (
    <div style={{display: 'flex', justifyContent: 'center'}}>
      <div style={{position: 'relative', width: 720, height: 420, transform: `translateY(${bob}px) rotate(-3deg)`}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 220,
            border: '16px solid rgba(188,214,203,0.86)',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 148,
            top: 72,
            width: 424,
            height: 236,
            borderRadius: 28,
            background: 'rgba(2,8,5,0.92)',
            border: '1px solid rgba(147,255,87,0.45)',
            boxShadow: '0 0 0 14px rgba(255,255,255,0.04), 0 0 90px rgba(147,255,87,0.16)',
            overflow: 'hidden',
          }}
        >
          <HudCard state="hint" compact />
        </div>
        <div
          style={{
            position: 'absolute',
            left: -28,
            top: 154,
            width: 138,
            height: 26,
            borderRadius: 26,
            background: 'rgba(188,214,203,0.82)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -28,
            top: 154,
            width: 138,
            height: 26,
            borderRadius: 26,
            background: 'rgba(188,214,203,0.82)',
          }}
        />
      </div>
    </div>
  );
};

const ProblemScene: React.FC = () => {
  const scene = SCENES[1]!;
  const progress = useSceneProgress(scene);
  return (
    <AbsoluteFill style={{padding: '80px 96px 130px'}}>
      <SectionBadge label="Problem" />
      <div style={{display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, marginTop: 32, flex: 1}}>
        <div style={{...frameGlow, borderRadius: 34, padding: 36}}>
          <div style={{fontSize: 56, ...titleStyle, marginBottom: 18}}>Conversation breaks at the worst moment</div>
          <p style={bodyCopy}>
            Daily spoken-English practice works best when the pressure feels real. The hard part is not grammar in
            isolation. It is retrieving the phrasing fast enough while someone is still waiting for your answer.
          </p>
          <TimelineProblem progress={progress} />
        </div>
        <div style={{display: 'grid', gap: 24}}>
          <PhonePanel />
          <QuotePanel />
        </div>
      </div>
      <FooterMeta />
    </AbsoluteFill>
  );
};

const TimelineProblem: React.FC<{progress: number}> = ({progress}) => {
  const stages = [
    {label: 'Idea is clear', state: 'ok'},
    {label: 'English phrasing stalls', state: 'warn'},
    {label: 'Phone lookup breaks eye contact', state: 'bad'},
    {label: 'Learning moment disappears', state: 'bad'},
  ] as const;
  return (
    <div style={{marginTop: 34, display: 'grid', gap: 18}}>
      {stages.map((stage, index) => {
        const active = progress > index / stages.length;
        const color = stage.state === 'ok' ? palette.accentSoft : stage.state === 'warn' ? '#ffe48b' : '#ff9e7d';
        return (
          <div
            key={stage.label}
            style={{display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 20, opacity: active ? 1 : 0.35}}
          >
            <div style={{fontFamily: 'Menlo, monospace', color, fontSize: 20}}>0{index + 1}</div>
            <div
              style={{
                padding: '18px 22px',
                borderRadius: 20,
                border: `1px solid ${active ? color : 'rgba(152,180,166,0.25)'}`,
                color: palette.text,
                background: active ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                fontSize: 26,
              }}
            >
              {stage.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PhonePanel: React.FC = () => (
  <div style={{...frameGlow, borderRadius: 34, padding: 28, minHeight: 280}}>
    <div style={{fontFamily: 'Menlo, monospace', color: palette.muted, fontSize: 18}}>why not a phone?</div>
    <div style={{marginTop: 26, borderRadius: 30, border: '2px solid rgba(255,255,255,0.18)', padding: 18}}>
      <div style={{borderRadius: 20, background: '#0b1110', padding: 22, minHeight: 176}}>
        <div style={{fontSize: 22, color: '#d4ddd8'}}>Search for English phrase...</div>
        <div style={{marginTop: 22, fontSize: 26, color: '#7d978a'}}>
          eyes down
          <br />
          turn lost
          <br />
          silence grows
        </div>
      </div>
    </div>
  </div>
);

const QuotePanel: React.FC = () => (
  <div style={{...frameGlow, borderRadius: 34, padding: 28}}>
    <div style={{fontFamily: 'Menlo, monospace', color: palette.accent, fontSize: 18}}>design target</div>
    <div style={{fontSize: 38, lineHeight: 1.18, marginTop: 16, ...titleStyle}}>
      Keep the learner&apos;s eyes up and the conversation alive.
    </div>
  </div>
);

const DemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = frame - SCENES[2]!.start * 30;
  let state: 'hint' | 'word' | 'quiet' | 'recap' = 'hint';
  if (local >= 810 && local < 1140) state = 'word';
  if (local >= 1140 && local < 1410) state = 'quiet';
  if (local >= 1410) state = 'recap';
  return (
    <AbsoluteFill style={{padding: '72px 84px 128px'}}>
      <SectionBadge label="Core demo" />
      <div style={{display: 'grid', gridTemplateColumns: '0.76fr 1.24fr', gap: 36, marginTop: 28, flex: 1}}>
        <ConversationRail state={state} />
        <GlassesStage state={state} />
      </div>
      <FooterMeta />
    </AbsoluteFill>
  );
};

const ConversationRail: React.FC<{state: 'hint' | 'word' | 'quiet' | 'recap'}> = ({state}) => {
  const turns = [
    'Them: We need to iterate on the prototype before the stakeholder review.',
    'You: Uh, I want say... we need more time before the review.',
    'Them: Is Friday a feasible deadline for your team?',
    'You: Maybe... Friday is too tight for us.',
    'Them: Which part is blocked right now?',
    'You: The login flow. I am not sure how to explain the risk.',
  ];
  return (
    <div style={{...frameGlow, borderRadius: 34, padding: 30}}>
      <div style={{fontFamily: 'Menlo, monospace', color: palette.muted, fontSize: 18}}>live transcript window</div>
      <div style={{display: 'grid', gap: 14, marginTop: 24}}>
        {turns.map((turn, index) => {
          const highlight =
            (state === 'hint' && index === 1) || (state === 'word' && index === 4) || (state === 'recap' && index === 5);
          return (
            <div
              key={turn}
              style={{
                padding: '16px 18px',
                borderRadius: 18,
                background: highlight ? 'rgba(147,255,87,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${highlight ? 'rgba(147,255,87,0.45)' : 'rgba(255,255,255,0.06)'}`,
                color: palette.text,
                fontSize: 24,
                lineHeight: 1.35,
              }}
            >
              {turn}
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 22, color: palette.muted, fontSize: 20}}>
        Judge: {state === 'quiet' ? 'NONE' : state.toUpperCase()}
      </div>
    </div>
  );
};

const GlassesStage: React.FC<{state: 'hint' | 'word' | 'quiet' | 'recap'}> = ({state}) => (
  <div style={{...frameGlow, borderRadius: 40, padding: 28, position: 'relative', overflow: 'hidden'}}>
    <div style={{fontFamily: 'Menlo, monospace', color: palette.muted, fontSize: 18}}>Even G2 style HUD playback</div>
    <div
      style={{
        marginTop: 22,
        height: 720,
        borderRadius: 36,
        background:
          'radial-gradient(circle at 50% 35%, rgba(137,255,90,0.1), transparent 38%), linear-gradient(180deg, #09130f, #040907)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 28,
          borderRadius: 220,
          border: '10px solid rgba(202,219,211,0.62)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 112,
          top: 196,
          width: 622,
          height: 311,
          borderRadius: 26,
          border: '1px solid rgba(147,255,87,0.4)',
          background: '#030805',
          boxShadow: '0 0 0 10px rgba(255,255,255,0.04), 0 0 80px rgba(147,255,87,0.16)',
          overflow: 'hidden',
        }}
      >
        <HudCard state={state} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          color: 'rgba(212,230,221,0.38)',
          fontFamily: 'Menlo, monospace',
          fontSize: 17,
          letterSpacing: '0.06em',
        }}
      >
        <span>576 x 288 monochrome HUD</span>
        <span>Text-first • BLE-safe</span>
      </div>
    </div>
  </div>
);

const HudCard: React.FC<{state: 'hint' | 'word' | 'quiet' | 'recap'; compact?: boolean}> = ({state, compact = false}) => {
  const fontScale = compact ? 0.72 : 1;
  const header = state === 'hint' ? 'HINT' : state === 'word' ? 'WORD' : state === 'recap' ? 'RECAP' : 'LISTEN';
  const body =
    state === 'hint'
      ? ['1 Could we push the deadline? · 締切延長', '2 Friday is too tight. · 金曜厳しい', '3 We need more time. · 時間必要']
      : state === 'word'
        ? ['stakeholder', 'decision maker']
        : state === 'recap'
          ? ['one more round of user testing']
          : ['quiet HUD', 'no intervention'];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: '#93ff57',
        fontFamily: 'Menlo, monospace',
        padding: `${18 * fontScale}px ${22 * fontScale}px`,
        background:
          'radial-gradient(circle at 20% 20%, rgba(147,255,87,0.11), transparent 24%), linear-gradient(180deg, #020603, #06110b)',
        textShadow: '0 0 16px rgba(147,255,87,0.24)',
      }}
    >
      <div style={{display: 'grid', gridTemplateColumns: `${96 * fontScale}px 1fr`, height: '100%'}}>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
          <div style={{fontSize: 20 * fontScale, letterSpacing: '0.12em'}}>LIVE</div>
          <div
            style={{
              width: 74 * fontScale,
              height: 74 * fontScale,
              borderRadius: 14 * fontScale,
              border: '1px solid rgba(147,255,87,0.4)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 22 * fontScale,
            }}
          >
            {header}
          </div>
        </div>
        <div style={{paddingLeft: 16 * fontScale, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
          <div style={{fontSize: 16 * fontScale, color: 'rgba(147,255,87,0.74)'}}>speaker coach</div>
          <div style={{display: 'grid', gap: 10 * fontScale, fontSize: 24 * fontScale, lineHeight: 1.22}}>
            {body.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div style={{fontSize: 16 * fontScale, color: 'rgba(147,255,87,0.62)'}}>max 2-second read</div>
        </div>
      </div>
    </div>
  );
};

const BuildScene: React.FC = () => (
  <AbsoluteFill style={{padding: '76px 90px 128px'}}>
    <SectionBadge label="How we built it" />
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 28, flex: 1}}>
      <div style={{...frameGlow, borderRadius: 34, padding: 30}}>
        <div style={{fontSize: 54, ...titleStyle, marginBottom: 24}}>Codex-built end to end</div>
        <div style={{display: 'grid', gap: 16}}>
          {[
            'Spec, review, and implementation all progressed inside Codex sessions.',
            'RECAP generation uses GPT-5.6.',
            'High-frequency HINT and WORD decisions use gpt-5.6-luna.',
            'ASR uses gpt-4o-mini-transcribe.',
          ].map((line) => (
            <div key={line} style={buildBulletStyle}>
              {line}
            </div>
          ))}
        </div>
        <div style={{marginTop: 28, fontFamily: 'Menlo, monospace', fontSize: 22, color: palette.accent}}>
          model split = quality where rare, cost where frequent
        </div>
      </div>
      <div style={{display: 'grid', gap: 30}}>
        <ArchitecturePanel />
        <BandwidthPanel />
      </div>
    </div>
    <FooterMeta />
  </AbsoluteFill>
);

const ArchitecturePanel: React.FC = () => (
  <div style={{...frameGlow, borderRadius: 34, padding: 28}}>
    <div style={{fontFamily: 'Menlo, monospace', color: palette.muted, fontSize: 18}}>runtime path</div>
    <div style={{display: 'grid', gap: 12, marginTop: 18}}>
      {[
        'Even G2 mic',
        '16 kHz PCM capture',
        'gpt-4o-mini-transcribe',
        'transcript window',
        'gpt-5.6-luna judge',
        'gpt-5.6 recap',
        'HUD renderer',
      ].map((item) => (
        <div key={item} style={pipeStyle}>
          {item}
        </div>
      ))}
    </div>
  </div>
);

const BandwidthPanel: React.FC = () => (
  <div style={{...frameGlow, borderRadius: 34, padding: 28}}>
    <div style={{fontFamily: 'Menlo, monospace', color: palette.muted, fontSize: 18}}>BLE budget shaped the product</div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18}}>
      {[
        'One fixed page',
        'TextContainer x3',
        'ImageContainer x1',
        'Text updates >= 200ms',
        'Image updates >= 1000ms',
        'Quiet by default',
      ].map((item) => (
        <div key={item} style={buildBulletStyle}>
          {item}
        </div>
      ))}
    </div>
  </div>
);

const ClosingScene: React.FC = () => (
  <AbsoluteFill style={{padding: '76px 90px 128px'}}>
    <SectionBadge label="Closing" />
    <div style={{display: 'grid', gridTemplateColumns: '1fr 0.92fr', gap: 34, marginTop: 28, flex: 1}}>
      <div style={{...frameGlow, borderRadius: 36, padding: 34}}>
        <div style={{fontSize: 62, ...titleStyle, lineHeight: 0.96}}>Judges can try it now</div>
        <p style={{...bodyCopy, marginTop: 24}}>
          Simulator support and demo mode make the entire flow reviewable without glasses, without a microphone, and
          without an API key.
        </p>
        <div style={{display: 'grid', gap: 14, marginTop: 26}}>
          {['npm run demo', 'npm run simulator', 'looped scripted HUD flow'].map((line) => (
            <div key={line} style={pipeStyle}>
              {line}
            </div>
          ))}
        </div>
        <div style={{marginTop: 34, fontSize: 38, ...titleStyle, color: '#eaf9b7'}}>Roadmap: GPT-Live practice mode integration</div>
      </div>
      <div style={{display: 'grid', gap: 24}}>
        <div style={{...frameGlow, borderRadius: 36, padding: 26}}>
          <div style={{fontFamily: 'Menlo, monospace', color: palette.accent, fontSize: 18}}>simulator + demo mode</div>
          <div style={{marginTop: 18, borderRadius: 26, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden'}}>
            <div style={{height: 44, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 18px', color: palette.muted}}>
              localhost:5173/?demo=1&loop=1
            </div>
            <div style={{padding: 20, background: '#0c1512'}}>
              <div style={{fontSize: 32, ...titleStyle}}>LinguaLens</div>
              <div style={{fontSize: 18, color: palette.muted, marginTop: 8}}>Mirrored HUD flow for judging</div>
              <div style={{marginTop: 18, borderRadius: 22, overflow: 'hidden'}}>
                <HudCard state="recap" />
              </div>
            </div>
          </div>
        </div>
        <div style={{...frameGlow, borderRadius: 36, padding: 26}}>
          <div style={{fontFamily: 'Menlo, monospace', color: palette.muted, fontSize: 18}}>product stance</div>
          <div style={{fontSize: 40, lineHeight: 1.15, ...titleStyle, marginTop: 12}}>
            Not an answer machine.
            <br />
            A quiet coach.
          </div>
        </div>
      </div>
    </div>
    <FooterMeta />
  </AbsoluteFill>
);

const SubtitleLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = captions.find((item) => frame >= item.startFrame && frame < item.endFrame) ?? captions[captions.length - 1]!;
  return (
    <div
      style={{
        position: 'absolute',
        left: 110,
        right: 110,
        bottom: 34,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1480,
          padding: '18px 28px',
          borderRadius: 24,
          background: 'rgba(4,8,7,0.86)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 20px 70px rgba(0,0,0,0.4)',
          textAlign: 'center',
          color: '#f7faf6',
          fontSize: 34,
          lineHeight: 1.35,
          fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif',
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

const FooterMeta: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const seconds = (frame / 30).toFixed(1).padStart(5, '0');
  const total = (durationInFrames / 30).toFixed(0);
  return (
    <div
      style={{
        position: 'absolute',
        left: 110,
        right: 110,
        bottom: 110,
        display: 'flex',
        justifyContent: 'space-between',
        color: 'rgba(152,180,166,0.7)',
        fontFamily: 'Menlo, monospace',
        fontSize: 18,
      }}
    >
      <span>1920x1080 • 30fps • no BGM</span>
      <span>
        t+{seconds}s / {total}s
      </span>
    </div>
  );
};

export const LinguaLensVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif'}}>
      <Background />
      <Sequence from={0} durationInFrames={300}>
        <TitleScene />
      </Sequence>
      <Sequence from={300} durationInFrames={900}>
        <ProblemScene />
      </Sequence>
      <Sequence from={1200} durationInFrames={1800}>
        <DemoScene />
      </Sequence>
      <Sequence from={3000} durationInFrames={1200}>
        <BuildScene />
      </Sequence>
      <Sequence from={4200} durationInFrames={750}>
        <ClosingScene />
      </Sequence>
      <Audio src={staticFile('narration.m4a')} />
      <SubtitleLayer />
    </AbsoluteFill>
  );
};
