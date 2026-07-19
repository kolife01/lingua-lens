import React from 'react';
import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {AUDIO_FILES, DIALOGUE_LINES, NARRATION_SECTIONS, SCENES, fps, totalSeconds} from './script';

type CaptionCue = {
  startFrame: number;
  endFrame: number;
  text: string;
};

type SceneWindow = (typeof SCENES)[number];

const palette = {
  bg: '#020303',
  panel: 'rgba(10, 14, 12, 0.84)',
  panelBorder: 'rgba(174, 255, 196, 0.18)',
  text: '#f4f7f1',
  muted: '#99aa9f',
  accent: '#92ff5b',
  accentSoft: '#b8ffcb',
  warning: '#ffe58d',
};

const hudFrames = [
  staticFile('hud/hud-1.png'),
  staticFile('hud/hud-2.png'),
  staticFile('hud/hud-3.png'),
  staticFile('hud/hud-4.png'),
  staticFile('hud/hud-5.png'),
  staticFile('hud/hud-6.png'),
];

const captions = buildCaptions();

function buildCaptions(): CaptionCue[] {
  return NARRATION_SECTIONS.flatMap((section) => {
    const scene = SCENES.find((item) => item.id === section.sceneId)!;
    const sectionStart = scene.start * fps;
    const sectionFrames = scene.duration * fps;
    const weights = section.sentences.map((sentence) => Math.max(3, sentence.trim().split(/\s+/).length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = sectionStart;
    return section.sentences.map((sentence, index) => {
      const remainingFrames = sectionStart + sectionFrames - cursor;
      const frames =
        index === section.sentences.length - 1
          ? remainingFrames
          : Math.max(30, Math.round((sectionFrames * weights[index]!) / totalWeight));
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

const useSceneFrame = (scene: SceneWindow) => {
  const frame = useCurrentFrame();
  return Math.max(0, frame - scene.start * fps);
};

const shell: React.CSSProperties = {
  background: palette.panel,
  border: `1px solid ${palette.panelBorder}`,
  borderRadius: 30,
  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.34)',
  backdropFilter: 'blur(18px)',
};

const sceneLabel: React.CSSProperties = {
  fontFamily: 'Menlo, Monaco, monospace',
  fontSize: 18,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: palette.accent,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif',
  color: palette.text,
  fontWeight: 700,
  letterSpacing: '-0.03em',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif',
  color: palette.muted,
  fontSize: 30,
  lineHeight: 1.45,
  margin: 0,
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, totalSeconds * fps], [0, 1]);
  return (
    <AbsoluteFill
      style={{
        background:
          `radial-gradient(circle at ${20 + drift * 12}% ${16 + drift * 8}%, rgba(146,255,91,0.10), transparent 24%),` +
          `radial-gradient(circle at ${78 - drift * 10}% ${72 - drift * 12}%, rgba(184,255,203,0.10), transparent 24%),` +
          'linear-gradient(180deg, #020303 0%, #040705 55%, #010201 100%)',
      }}
    />
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: 0.08,
        backgroundImage:
          `radial-gradient(circle at ${frame % 120}% 20%, rgba(255,255,255,0.16) 0 1px, transparent 1px),` +
          `radial-gradient(circle at ${(frame * 2) % 100}% 80%, rgba(255,255,255,0.10) 0 1px, transparent 1px)`,
        backgroundSize: '18px 18px, 24px 24px',
        mixBlendMode: 'screen',
      }}
    />
  );
};

const ColdOpenScene: React.FC = () => {
  const scene = SCENES[0]!;
  const local = useSceneFrame(scene);
  const freezeFrame = 9 * fps;
  const frozen = local >= freezeFrame;
  const activeFrame = frozen ? freezeFrame : local;
  const bars = new Array(42).fill(true).map((_, index) => {
    const raw = Math.sin(activeFrame / 5 + index * 0.55) + Math.sin(activeFrame / 11 + index * 0.28);
    const height = 18 + Math.abs(raw) * 52;
    return height;
  });
  const pulse = frozen ? 1 : 1 + Math.sin(local / 8) * 0.08;
  const lineProgress = interpolate(local, [0, 3 * fps, 7 * fps, freezeFrame], [0, 1, 1, 1], {extrapolateRight: 'clamp'});
  const secondLineProgress = interpolate(local, [2.2 * fps, 5 * fps, 8 * fps, freezeFrame], [0, 0.2, 1, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{padding: '92px 110px 180px'}}>
      <div style={{...sceneLabel, color: 'rgba(255,255,255,0.48)'}}>Cold open</div>
      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '100%', maxWidth: 1440}}>
          <div
            style={{
              ...shell,
              minHeight: 480,
              borderRadius: 36,
              background: frozen ? 'rgba(7, 7, 7, 0.94)' : 'rgba(4, 5, 5, 0.92)',
              padding: '56px 64px',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.44)', fontFamily: 'Menlo, Monaco, monospace'}}>
              <span>GPT-Live practice</span>
              <span>{frozen ? 'freeze detected' : 'listening'}</span>
            </div>
            <div style={{height: 220, display: 'flex', alignItems: 'center', gap: 10, marginTop: 34, transform: `scale(${pulse})`}}>
              {bars.map((height, index) => (
                <div
                  key={index}
                  style={{
                    width: 16,
                    height,
                    borderRadius: 999,
                    background: frozen ? 'rgba(255,255,255,0.18)' : 'linear-gradient(180deg, #92ff5b, #d4ffd7)',
                    boxShadow: frozen ? 'none' : '0 0 22px rgba(146,255,91,0.22)',
                  }}
                />
              ))}
            </div>
            <div style={{display: 'grid', gap: 16, marginTop: 42}}>
              <DialogueCard
                speaker="GPT-Live"
                text={DIALOGUE_LINES[0]!.text}
                progress={lineProgress}
                emphasized={false}
              />
              <DialogueCard
                speaker="Me"
                text={DIALOGUE_LINES[1]!.text}
                progress={secondLineProgress}
                emphasized
                frozen={frozen}
              />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const DialogueCard: React.FC<{
  speaker: string;
  text: string;
  progress: number;
  emphasized?: boolean;
  frozen?: boolean;
}> = ({speaker, text, progress, emphasized = false, frozen = false}) => {
  const visibleCount = Math.max(0, Math.round(text.length * progress));
  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: 22,
        border: `1px solid ${emphasized ? 'rgba(146,255,91,0.34)' : 'rgba(255,255,255,0.10)'}`,
        background: emphasized ? 'rgba(146,255,91,0.07)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <div style={{fontFamily: 'Menlo, Monaco, monospace', fontSize: 17, color: emphasized ? palette.accent : 'rgba(255,255,255,0.50)'}}>
        {speaker}
      </div>
      <div
        style={{
          marginTop: 8,
          color: palette.text,
          fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif',
          fontSize: 42,
          lineHeight: 1.16,
          opacity: progress > 0 ? 1 : 0.18,
        }}
      >
        {text.slice(0, visibleCount)}
        {visibleCount < text.length ? <span style={{opacity: 0.46}}>{text.slice(visibleCount)}</span> : null}
        {frozen ? <span style={{color: palette.warning}}> |</span> : null}
      </div>
    </div>
  );
};

const ProblemScene: React.FC = () => {
  const scene = SCENES[1]!;
  const local = useSceneFrame(scene);
  const focus = Math.floor(interpolate(local, [0, scene.duration * fps - 1], [0, 2], {extrapolateRight: 'clamp'}));
  const points = [
    'The phrase is almost there.',
    'Looking down kills the exchange.',
    'Moving on erases the lesson.',
  ];
  return (
    <AbsoluteFill style={{padding: '90px 110px 180px'}}>
      <div style={sceneLabel}>The problem</div>
      <div style={{display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 34, marginTop: 34, flex: 1}}>
        <div style={{...shell, padding: 42}}>
          <div style={{...titleStyle, fontSize: 86, lineHeight: 0.95, maxWidth: 760}}>The best learning moment disappears in real time.</div>
          <p style={{...bodyStyle, marginTop: 28, maxWidth: 720}}>
            Spoken practice works because it creates pressure. The failure point is retrieval under that pressure, exactly when the other side is still waiting.
          </p>
          <div style={{display: 'grid', gap: 18, marginTop: 40}}>
            {points.map((point, index) => (
              <div
                key={point}
                style={{
                  padding: '18px 22px',
                  borderRadius: 20,
                  border: `1px solid ${focus >= index ? 'rgba(146,255,91,0.32)' : 'rgba(255,255,255,0.08)'}`,
                  background: focus >= index ? 'rgba(146,255,91,0.07)' : 'rgba(255,255,255,0.02)',
                  color: palette.text,
                  fontSize: 30,
                }}
              >
                {point}
              </div>
            ))}
          </div>
        </div>
        <div style={{display: 'grid', gap: 24}}>
          <PanelTitle title="What breaks" body="A phone steals your eyes, your timing, and the exact phrase that should have become tomorrow's review card." />
          <div style={{...shell, padding: 30}}>
            <div style={{fontFamily: 'Menlo, Monaco, monospace', fontSize: 17, color: palette.muted}}>timeline</div>
            <div style={{display: 'grid', gap: 16, marginTop: 20}}>
              {[
                'Idea is clear',
                'English stalls',
                'Phone lookup',
                'Turn collapses',
              ].map((step, index) => (
                <div key={step} style={{display: 'grid', gridTemplateColumns: '72px 1fr', gap: 16, alignItems: 'center'}}>
                  <div style={{fontFamily: 'Menlo, Monaco, monospace', color: index < 2 ? palette.accentSoft : '#ffb39f'}}>{`0${index + 1}`}</div>
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: 18,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                      color: palette.text,
                      fontSize: 24,
                    }}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RevealScene: React.FC = () => {
  const scene = SCENES[2]!;
  const local = useSceneFrame(scene);
  const push = spring({fps, frame: local, config: {damping: 16, stiffness: 100}});
  const hudGlow = spring({fps, frame: local - 40, config: {damping: 14, stiffness: 120}});
  return (
    <AbsoluteFill style={{padding: '86px 110px 180px'}}>
      <div style={sceneLabel}>Reveal</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 0.92fr', gap: 36, marginTop: 28, flex: 1, alignItems: 'center'}}>
        <div style={{...shell, padding: 34, minHeight: 600, display: 'grid', placeItems: 'center'}}>
          <div style={{position: 'relative', width: 760, height: 420, transform: `translateY(${18 - push * 18}px) scale(${0.94 + push * 0.06})`}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 240, border: '16px solid rgba(220,231,225,0.72)'}} />
            <div
              style={{
                position: 'absolute',
                left: 170,
                top: 84,
                width: 420,
                height: 230,
                borderRadius: 28,
                background: '#020503',
                border: '1px solid rgba(146,255,91,0.38)',
                boxShadow: `0 0 ${70 * hudGlow}px rgba(146,255,91,0.18)`,
                overflow: 'hidden',
              }}
            >
              <Img src={hudFrames[0]} style={{width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88}} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(circle at 72% 40%, rgba(146,255,91,${0.10 + hudGlow * 0.22}), transparent 26%)`,
                }}
              />
            </div>
            <div style={{position: 'absolute', left: -40, top: 156, width: 150, height: 26, borderRadius: 26, background: 'rgba(220,231,225,0.78)'}} />
            <div style={{position: 'absolute', right: -40, top: 156, width: 150, height: 26, borderRadius: 26, background: 'rgba(220,231,225,0.78)'}} />
          </div>
        </div>
        <div>
          <div style={{...titleStyle, fontSize: 88, lineHeight: 0.92}}>LinguaLens</div>
          <div style={{...titleStyle, fontSize: 34, color: '#dbefe1', marginTop: 14}}>a coach that stays inside the conversation</div>
          <p style={{...bodyStyle, marginTop: 28, maxWidth: 560}}>
            Even G2 gives the right surface: silent, glanceable, and always in view when the sentence stalls.
          </p>
          <div style={{display: 'grid', gap: 16, marginTop: 28}}>
            {['Silent HUD', 'Own-language gloss', 'Only when needed'].map((item) => (
              <div key={item} style={{...shell, padding: '18px 22px', color: palette.text, fontSize: 28}}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CoreDemoScene: React.FC = () => {
  const scene = SCENES[3]!;
  const local = useSceneFrame(scene);
  const stage = local < 22 * fps ? 'hint' : local < 34 * fps ? 'word' : local < 46 * fps ? 'recap' : 'quiet';
  const hudSrc =
    stage === 'hint'
      ? local < 12 * fps
        ? hudFrames[0]
        : hudFrames[1]
      : stage === 'word'
        ? local < 28 * fps
          ? hudFrames[2]
          : hudFrames[3]
        : stage === 'recap'
          ? hudFrames[4]
          : hudFrames[5];
  const activeTurn = stage === 'hint' ? 1 : stage === 'word' ? 2 : stage === 'recap' ? 5 : 5;
  return (
    <AbsoluteFill style={{padding: '84px 104px 180px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={sceneLabel}>Core demo</div>
        <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.muted, fontSize: 17}}>same conversation, replayed with a coach</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 28, marginTop: 26, flex: 1}}>
        <HudPlayback stage={stage} hudSrc={hudSrc} />
        <ConversationPanel activeTurn={activeTurn} />
      </div>
    </AbsoluteFill>
  );
};

const HudPlayback: React.FC<{stage: 'hint' | 'word' | 'recap' | 'quiet'; hudSrc: string}> = ({stage, hudSrc}) => {
  return (
    <div style={{...shell, padding: 28, overflow: 'hidden'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.muted, fontSize: 17}}>left: real HUD capture</div>
        <StageChip stage={stage} />
      </div>
      <div
        style={{
          marginTop: 22,
          height: 720,
          borderRadius: 34,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, #06100a, #020503)',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{position: 'absolute', inset: 32, borderRadius: 240, border: '11px solid rgba(217,225,220,0.62)'}} />
        <div
          style={{
            width: 760,
            height: 380,
            borderRadius: 28,
            overflow: 'hidden',
            background: '#00ff00',
            boxShadow: '0 0 0 10px rgba(255,255,255,0.04), 0 0 80px rgba(146,255,91,0.18)',
          }}
        >
          <Img src={hudSrc} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            bottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(232,240,235,0.42)',
            fontFamily: 'Menlo, Monaco, monospace',
            fontSize: 16,
          }}
        >
          <span>576 x 288 capture</span>
          <span>{stage === 'quiet' ? 'blank HUD hold: 2s' : 'coach speaks in text'}</span>
        </div>
      </div>
    </div>
  );
};

const StageChip: React.FC<{stage: 'hint' | 'word' | 'recap' | 'quiet'}> = ({stage}) => (
  <div
    style={{
      borderRadius: 999,
      border: `1px solid ${stage === 'word' ? 'rgba(255,229,141,0.35)' : 'rgba(146,255,91,0.35)'}`,
      color: stage === 'word' ? palette.warning : palette.accent,
      padding: '10px 16px',
      fontFamily: 'Menlo, Monaco, monospace',
      fontSize: 17,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}
  >
    {stage}
  </div>
);

const ConversationPanel: React.FC<{activeTurn: number}> = ({activeTurn}) => {
  return (
    <div style={{...shell, padding: 30}}>
      <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.muted, fontSize: 17}}>right: conversation subtitles</div>
      <div style={{display: 'grid', gap: 16, marginTop: 22}}>
        {DIALOGUE_LINES.map((line, index) => (
          <div
            key={`${line.speaker}-${index}`}
            style={{
              padding: '18px 20px',
              borderRadius: 20,
              border: `1px solid ${index === activeTurn ? 'rgba(146,255,91,0.34)' : 'rgba(255,255,255,0.08)'}`,
              background: index === activeTurn ? 'rgba(146,255,91,0.07)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{fontFamily: 'Menlo, Monaco, monospace', fontSize: 16, color: index === activeTurn ? palette.accent : palette.muted}}>
              {line.speaker}
            </div>
            <div style={{marginTop: 8, color: palette.text, fontSize: 30, lineHeight: 1.25}}>{line.text}</div>
          </div>
        ))}
      </div>
      <div style={{display: 'grid', gap: 16, marginTop: 24}}>
        <PanelTitle
          title="HINT"
          body="One to three complete lines appear exactly when the sentence stalls."
          compact
        />
        <PanelTitle
          title="WORD"
          body="A three-word gloss is enough when GPT-Live says a new term."
          compact
        />
        <PanelTitle
          title="RECAP"
          body="The missed phrase returns after the pressure passes."
          compact
        />
      </div>
    </div>
  );
};

const BuildScene: React.FC = () => {
  return (
    <AbsoluteFill style={{padding: '84px 104px 180px'}}>
      <div style={sceneLabel}>Why glasses / how it&apos;s built</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 28, flex: 1}}>
        <BuildCard
          title="Why this interface"
          lines={[
            'A phone kills the conversation.',
            'Audio would talk over it.',
            'A silent HUD fits inside the turn.',
            'Silence is part of the product.',
          ]}
        />
        <BuildCard
          title="Codex + models"
          lines={[
            'Codex wrote the app end to end.',
            'GPT-5.6 writes RECAP.',
            'luna makes the real-time help-or-stay-quiet call.',
            'The session logs live in the repo.',
          ]}
        />
        <BuildCard
          title="BLE honesty"
          lines={[
            'Text first.',
            'One image.',
            'Tiny payloads.',
            'Nothing wasted.',
          ]}
        />
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1.06fr 0.94fr', gap: 28, marginTop: 26}}>
        <ArchitectureRail />
        <RepoCallout />
      </div>
    </AbsoluteFill>
  );
};

const BuildCard: React.FC<{title: string; lines: string[]}> = ({title, lines}) => (
  <div style={{...shell, padding: 28}}>
    <div style={{...titleStyle, fontSize: 40, lineHeight: 1.02}}>{title}</div>
    <div style={{display: 'grid', gap: 14, marginTop: 22}}>
      {lines.map((line) => (
        <div
          key={line}
          style={{
            padding: '16px 18px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: palette.text,
            fontSize: 24,
            lineHeight: 1.28,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  </div>
);

const ArchitectureRail: React.FC = () => (
  <div style={{...shell, padding: 28}}>
    <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.muted, fontSize: 17}}>runtime path</div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginTop: 18}}>
      {['Mic', 'ASR', 'Window', 'Judge', 'Hint/Word', 'Recap', 'HUD'].map((step) => (
        <div
          key={step}
          style={{
            padding: '16px 10px',
            borderRadius: 16,
            border: '1px solid rgba(146,255,91,0.22)',
            background: 'rgba(146,255,91,0.05)',
            color: '#e5fbe9',
            textAlign: 'center',
            fontFamily: 'Menlo, Monaco, monospace',
            fontSize: 18,
          }}
        >
          {step}
        </div>
      ))}
    </div>
  </div>
);

const RepoCallout: React.FC = () => (
  <div style={{...shell, padding: 28}}>
    <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.accent, fontSize: 17}}>repo evidence</div>
    <div style={{display: 'grid', gap: 14, marginTop: 18}}>
      {[
        'docs/spec.md',
        'session-logs/codex-*.md',
        'apps/lingua-lens',
        'video/NARRATION-v1.md',
      ].map((file) => (
        <div
          key={file}
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            color: palette.text,
            fontFamily: 'Menlo, Monaco, monospace',
            fontSize: 21,
          }}
        >
          {file}
        </div>
      ))}
    </div>
  </div>
);

const CloseScene: React.FC = () => {
  const scene = SCENES[5]!;
  const local = useSceneFrame(scene);
  const showCard = local > 17 * fps;
  return (
    <AbsoluteFill style={{padding: '84px 104px 180px'}}>
      <div style={sceneLabel}>Close</div>
      {!showCard ? (
        <div style={{display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 28, marginTop: 28, flex: 1}}>
          <RepoPreview />
          <SimulatorPreview />
        </div>
      ) : (
        <EndCard />
      )}
    </AbsoluteFill>
  );
};

const RepoPreview: React.FC = () => (
  <div style={{...shell, padding: 28}}>
    <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.muted, fontSize: 17}}>repository</div>
    <div style={{marginTop: 18, borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)'}}>
      <div style={{height: 54, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', padding: '0 18px', color: palette.muted}}>
        github.com/kolife01/lingua-lens
      </div>
      <div style={{padding: 24, background: '#09100d', display: 'grid', gap: 14}}>
        {['README.md', 'apps/lingua-lens', 'video/', 'session-logs/', 'simulator/'].map((row) => (
          <div key={row} style={{display: 'grid', gridTemplateColumns: '180px 1fr', gap: 14, color: palette.text, fontSize: 24}}>
            <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.accentSoft}}>{row}</div>
            <div>Ready to run, inspect, and replace the narration files later.</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SimulatorPreview: React.FC = () => (
  <div style={{...shell, padding: 28}}>
    <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.muted, fontSize: 17}}>official simulator</div>
    <div style={{marginTop: 18, borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)'}}>
      <div style={{height: 54, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', padding: '0 18px', color: palette.muted}}>
        localhost:5173/simulator
      </div>
      <div style={{padding: 24, background: '#0b1310'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
          <div>
            <div style={{...titleStyle, fontSize: 42}}>Demo conversation</div>
            <div style={{marginTop: 14, color: palette.muted, fontSize: 24}}>Scripted GPT-Live loop, no glasses, no API key.</div>
          </div>
          <div style={{borderRadius: 18, overflow: 'hidden', background: '#00ff00'}}>
            <Img src={hudFrames[4]} style={{width: '100%', height: 200, objectFit: 'cover'}} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EndCard: React.FC = () => (
  <div style={{...shell, padding: 48, marginTop: 40, display: 'grid', placeItems: 'center', flex: 1}}>
    <div style={{textAlign: 'center'}}>
      <div style={{...titleStyle, fontSize: 108, lineHeight: 0.9}}>LinguaLens</div>
      <div style={{...titleStyle, fontSize: 34, color: '#dcefe1', marginTop: 16}}>
        Full phrases when you&apos;re stuck. Silence when you&apos;re not.
      </div>
      <div style={{fontFamily: 'Menlo, Monaco, monospace', color: palette.accent, fontSize: 24, marginTop: 26}}>
        github.com/kolife01/lingua-lens
      </div>
      <div style={{color: palette.muted, fontSize: 24, marginTop: 14}}>Built with Codex and GPT-5.6</div>
    </div>
  </div>
);

const PanelTitle: React.FC<{title: string; body: string; compact?: boolean}> = ({title, body, compact = false}) => (
  <div style={{...shell, padding: compact ? '18px 20px' : 28}}>
    <div style={{...titleStyle, fontSize: compact ? 30 : 36}}>{title}</div>
    <p style={{...bodyStyle, fontSize: compact ? 22 : 26, marginTop: 10}}>{body}</p>
  </div>
);

const SubtitleLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = captions.find((item) => frame >= item.startFrame && frame < item.endFrame) ?? captions[captions.length - 1]!;
  return (
    <div
      style={{
        position: 'absolute',
        left: 88,
        right: 88,
        bottom: 34,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1560,
          padding: '18px 28px',
          borderRadius: 24,
          background: 'rgba(2, 5, 4, 0.90)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 16px 46px rgba(0,0,0,0.36)',
          textAlign: 'center',
          color: '#f7faf6',
          fontSize: 34,
          lineHeight: 1.28,
          fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif',
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

const Timecode: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 110,
        right: 110,
        bottom: 116,
        display: 'flex',
        justifyContent: 'space-between',
        color: 'rgba(153,170,159,0.76)',
        fontFamily: 'Menlo, Monaco, monospace',
        fontSize: 17,
      }}
    >
      <span>1920 x 1080 • 30 fps • no BGM</span>
      <span>
        t+{(frame / fps).toFixed(1)} / {(durationInFrames / fps).toFixed(0)}s
      </span>
    </div>
  );
};

export const LinguaLensVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: 'Avenir Next, Helvetica, Arial, sans-serif'}}>
      <Background />
      <Grain />
      <Sequence from={SCENES[0]!.start * fps} durationInFrames={SCENES[0]!.duration * fps}>
        <ColdOpenScene />
      </Sequence>
      <Sequence from={SCENES[1]!.start * fps} durationInFrames={SCENES[1]!.duration * fps}>
        <ProblemScene />
      </Sequence>
      <Sequence from={SCENES[2]!.start * fps} durationInFrames={SCENES[2]!.duration * fps}>
        <RevealScene />
      </Sequence>
      <Sequence from={SCENES[3]!.start * fps} durationInFrames={SCENES[3]!.duration * fps}>
        <CoreDemoScene />
      </Sequence>
      <Sequence from={SCENES[4]!.start * fps} durationInFrames={SCENES[4]!.duration * fps}>
        <BuildScene />
      </Sequence>
      <Sequence from={SCENES[5]!.start * fps} durationInFrames={SCENES[5]!.duration * fps}>
        <CloseScene />
      </Sequence>
      {SCENES.map((scene, index) => (
        <Sequence key={scene.id} from={scene.start * fps} durationInFrames={scene.duration * fps}>
          <Audio src={staticFile(AUDIO_FILES[index]!)} />
        </Sequence>
      ))}
      <SubtitleLayer />
      <Timecode />
    </AbsoluteFill>
  );
};
