import React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {AUDIO_FILES, DIALOGUE_LINES, SCENES, fps, totalSeconds} from './script';

const p = {
  ink: '#030706', panel: 'rgba(10,17,14,0.88)', line: 'rgba(218,238,224,0.12)',
  text: '#f1f7f2', muted: '#8e9e93', lime: '#99ff64', mint: '#c7ffdb',
  human: '#8db9ff', amber: '#ffd56a', red: '#ff9d8a',
};

const hud = [1, 2, 3, 4, 5, 6].map((n) => staticFile(`hud/hud-${n}.png`));
const mono = 'Menlo, Monaco, monospace';
const sans = 'Avenir Next, Helvetica, Arial, sans-serif';
const panel: React.CSSProperties = {background: p.panel, border: `1px solid ${p.line}`, borderRadius: 28, boxShadow: '0 26px 70px rgba(0,0,0,.28)'};
const label: React.CSSProperties = {fontFamily: mono, color: p.lime, fontSize: 16, letterSpacing: '.16em', textTransform: 'uppercase'};

const localFrame = (start: number) => Math.max(0, useCurrentFrame() - start * fps);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const d = interpolate(frame, [0, totalSeconds * fps], [0, 1]);
  return <AbsoluteFill style={{background: `radial-gradient(ellipse at ${20 + d * 14}% ${16 + d * 8}%, rgba(153,255,100,.11), transparent 28%), radial-gradient(ellipse at ${80 - d * 10}% 80%, rgba(141,185,255,.08), transparent 30%), linear-gradient(150deg, #030706, #07100b 58%, #020403)`}} />;
};

const Waveform: React.FC<{active: boolean; color: string; intensity?: number; flat?: boolean}> = ({active, color, intensity = 1, flat = false}) => {
  const frame = useCurrentFrame();
  return <div style={{height: 54, display: 'flex', alignItems: 'center', gap: 4}}>{Array.from({length: 34}, (_, i) => {
    const wave = Math.abs(Math.sin(frame / 4.8 + i * .67) + Math.sin(frame / 10 + i * .28)) / 2;
    const h = flat ? 4 : active ? 7 + wave * 38 * intensity : 4 + ((i * 7) % 3);
    return <div key={i} style={{width: 5, height: h, borderRadius: 10, background: active ? color : 'rgba(255,255,255,.12)', boxShadow: active ? `0 0 12px ${color}55` : 'none'}} />;
  })}</div>;
};

type Turn = {speaker: 'GPT-Live' | 'Me'; text: string; at: number; until: number; stalled?: boolean};
const turns: Turn[] = [
  {speaker: 'GPT-Live', text: DIALOGUE_LINES[0].text, at: 1.2, until: 4.2},
  {speaker: 'Me', text: DIALOGUE_LINES[1].text, at: 4.4, until: 9.2, stalled: true},
  {speaker: 'Me', text: 'Friday is too tight. We need more time before the review.', at: 14.2, until: 18.0},
  {speaker: 'GPT-Live', text: DIALOGUE_LINES[2].text, at: 20.0, until: 23.8},
  {speaker: 'GPT-Live', text: DIALOGUE_LINES[4].text, at: 26.0, until: 29.5},
  {speaker: 'Me', text: DIALOGUE_LINES[5].text, at: 34.0, until: 38.4},
];

const LiveConversation: React.FC<{seconds: number; compact?: boolean; ghost?: boolean}> = ({seconds, compact = false, ghost = false}) => {
  const frame = useCurrentFrame();
  const scale = compact ? .72 : 1;
  return <div style={{...panel, padding: compact ? 22 : 30, opacity: ghost ? .34 : 1, transform: `scale(${scale})`, transformOrigin: 'top left', width: compact ? '138%' : undefined}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={label}>Voice practice · live</div><div style={{fontFamily: mono, fontSize: 14, color: seconds > 9 && seconds < 12 ? p.amber : p.muted}}>{seconds > 9 && seconds < 12 ? 'thinking… 01.6s' : 'connected'}</div>
    </div>
    <div style={{display: 'grid', gap: compact ? 10 : 14, marginTop: compact ? 14 : 22}}>
      {turns.map((turn, i) => {
        const shown = seconds >= turn.at;
        const speaking = seconds >= turn.at && seconds < turn.until;
        const age = Math.max(0, seconds - turn.at);
        const stalledNow = turn.stalled && seconds > 7.5 && seconds < 12;
        const typed = Math.min(turn.text.length, Math.floor(turn.text.length * Math.min(1, age / .9)));
        const color = turn.speaker === 'Me' ? p.human : p.lime;
        return <div key={i} style={{display: shown ? 'block' : 'none', padding: compact ? '12px 15px' : '16px 19px', borderRadius: 18, background: speaking ? `${color}12` : 'rgba(255,255,255,.022)', border: `1px solid ${speaking ? `${color}77` : 'rgba(255,255,255,.07)'}`, opacity: speaking ? 1 : .54, transition: 'none'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}><span style={{fontFamily: mono, color, fontSize: compact ? 13 : 15}}>{turn.speaker === 'Me' ? 'LEARNER' : 'GPT-LIVE'}</span><Waveform active={speaking && !stalledNow} color={color} intensity={stalledNow ? .12 : 1} flat={stalledNow} /></div>
          <div style={{fontFamily: sans, color: p.text, fontSize: compact ? 23 : 29, lineHeight: 1.22, marginTop: -7}}>{turn.text.slice(0, typed)}{stalledNow ? <span style={{color: p.amber}}> ···</span> : null}</div>
        </div>;
      })}
    </div>
  </div>;
};

const HudFrame: React.FC<{src: string; tag: string; signal?: number}> = ({src, tag, signal = 0}) => <div style={{...panel, padding: 26, position: 'relative', overflow: 'hidden'}}>
  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 18}}><span style={label}>Even G2 · simulator capture</span><span style={{fontFamily: mono, color: p.muted, fontSize: 14}}>{tag}</span></div>
  <div style={{height: 522, borderRadius: 26, background: '#061008', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative'}}>
    <div style={{position: 'absolute', inset: 25, border: '9px solid rgba(222,235,227,.48)', borderRadius: 210}} />
    <div style={{width: 760, height: 380, overflow: 'hidden', borderRadius: 24, boxShadow: `0 0 ${40 + signal * 50}px rgba(153,255,100,.25)`}}><Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div>
  </div>
  <div style={{fontFamily: mono, color: 'rgba(202,221,207,.52)', fontSize: 14, marginTop: 16}}>official simulator · 576 × 288</div>
</div>;

const SignalBridge: React.FC<{progress: number}> = ({progress}) => <div style={{position: 'absolute', left: '48.3%', top: '47%', width: '5%', height: 3, background: 'rgba(153,255,100,.16)', overflow: 'visible'}}>
  <div style={{position: 'absolute', width: 18, height: 18, borderRadius: 99, top: -7.5, left: `${progress * 100}%`, background: p.lime, opacity: progress ? 1 : 0, boxShadow: '0 0 28px 8px rgba(153,255,100,.65)'}} />
</div>;

const ColdOpen: React.FC = () => { const s = localFrame(0) / fps; return <Scene title="Cold open"><div style={{maxWidth: 1400, margin: 'auto', paddingTop: 70}}><LiveConversation seconds={s} /><div style={{height: 18}} />{s > 9 ? <div style={{textAlign: 'center', fontFamily: mono, color: p.amber, letterSpacing: '.14em', fontSize: 16}}>THE CONVERSATION IS STILL WAITING</div> : null}</div></Scene>; };

const Problem: React.FC = () => { const s = localFrame(18) / fps; return <Scene title="The problem"><div style={{display: 'grid', gridTemplateColumns: '1.03fr .97fr', gap: 34, alignItems: 'center', flex: 1}}><div><div style={{fontFamily: sans, fontSize: 83, fontWeight: 700, letterSpacing: '-.055em', lineHeight: .94, color: p.text}}>The best learning moment disappears in real time.</div><div style={{marginTop: 28, color: p.muted, fontSize: 30, lineHeight: 1.35}}>A phone takes your eyes away. Moving on loses the phrase. The turn keeps moving either way.</div><div style={{display: 'flex', gap: 14, marginTop: 34}}>{['idea', 'stall', 'lookup', 'lost turn'].map((x,i) => <div key={x} style={{fontFamily: mono, color: i === 1 ? p.amber : p.muted, borderTop: `2px solid ${i === 1 ? p.amber : p.line}`, paddingTop: 12, flex: 1}}>{x}</div>)}</div></div><LiveConversation seconds={Math.min(11.6, 4 + s * .4)} compact ghost /></div></Scene>; };

const Reveal: React.FC = () => { const f = localFrame(40); const enter = spring({fps, frame: f, config: {damping: 15}}); return <Scene title="Reveal"><div style={{display: 'grid', gridTemplateColumns: '.88fr 1.12fr', gap: 40, flex: 1, alignItems: 'center'}}><div style={{transform: `scale(${.9 + enter*.1})`}}><HudFrame src={hud[0]} tag="silent coach" signal={enter} /></div><div><div style={{fontSize: 100, fontFamily: sans, fontWeight: 700, color: p.text, letterSpacing: '-.06em'}}>LinguaLens</div><div style={{fontSize: 36, color: p.mint, marginTop: 10}}>A coach that stays inside the conversation.</div><div style={{fontSize: 29, lineHeight: 1.42, color: p.muted, marginTop: 32}}>A silent, glanceable HUD on Even G2: complete phrases when needed, nothing when not.</div></div></div></Scene>; };

const CoreDemo: React.FC = () => { const s = localFrame(52) / fps; const stage = s < 13 ? 'stall detected' : s < 23 ? 'hint selected' : s < 34 ? 'word gloss' : s < 45 ? 'recap' : 'quiet'; const src = s < 13 ? hud[0] : s < 23 ? hud[1] : s < 34 ? hud[3] : s < 45 ? hud[4] : hud[5]; const signal = s < 10 ? 0 : Math.min(1, (s - 10) / 1.2); return <Scene title="Core demo" note="same conversation · a visual coach responds"><div style={{position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, flex: 1}}><LiveConversation seconds={s} /><HudFrame src={src} tag={stage} signal={signal} /><SignalBridge progress={signal} />{s > 13 && s < 21 ? <div style={{position: 'absolute', right: 48, bottom: 57, width: 550, padding: 16, borderRadius: 16, background: 'rgba(153,255,100,.14)', border: '1px solid rgba(153,255,100,.55)', color: p.mint, fontFamily: mono, fontSize: 17}}>SELECTED → “Friday is too tight.”</div> : null}</div></Scene>; };

const Build: React.FC = () => { const s = localFrame(100) / fps; return <Scene title="Why glasses / how it's built"><div style={{display: 'grid', gridTemplateColumns: '.7fr 1.3fr', gap: 30, flex: 1}}><LiveConversation seconds={Math.min(8, s*.22 + 2)} compact ghost /><div style={{display: 'grid', gridTemplateRows: '1fr .9fr', gap: 24}}><div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18}}>{[['Why glasses','Phone breaks eye contact. Audio talks over the turn.'],['Codex + models','Codex built it. GPT-5.6 writes review phrases. luna judges urgency.'],['BLE honesty','Text first. One image. Tiny payloads.']].map(([t,b]) => <div key={t} style={{...panel,padding:28}}><div style={{fontSize:31,color:p.text,fontWeight:700}}>{t}</div><div style={{fontSize:22,lineHeight:1.38,color:p.muted,marginTop:18}}>{b}</div></div>)}</div><div style={{...panel,padding:28}}><div style={label}>runtime path</div><div style={{display:'flex',alignItems:'center',gap:10,marginTop:28}}>{['Mic','ASR','Judge','Hint / Word','Recap','HUD'].map((x,i)=><React.Fragment key={x}><div style={{flex:1, padding:'15px 8px',borderRadius:14,textAlign:'center',background:'rgba(153,255,100,.07)',border:'1px solid rgba(153,255,100,.24)',color:p.mint,fontFamily:mono,fontSize:16}}>{x}</div>{i<5?<span style={{color:p.lime}}>→</span>:null}</React.Fragment>)}</div></div></div></div></Scene>; };

const Close: React.FC = () => { const s = localFrame(140) / fps; const end = s > 17; return <Scene title="Close">{end ? <div style={{...panel,display:'grid',placeItems:'center',flex:1}}><div style={{textAlign:'center'}}><div style={{fontSize:112,fontWeight:700,letterSpacing:'-.07em',color:p.text}}>LinguaLens</div><div style={{fontSize:35,color:p.mint,marginTop:12}}>Full phrases when you&apos;re stuck. Silence when you&apos;re not.</div><div style={{fontFamily:mono,fontSize:24,color:p.lime,marginTop:30}}>github.com/kolife01/lingua-lens</div><div style={{fontSize:21,color:p.muted,marginTop:15}}>Built with Codex &amp; GPT-5.6</div></div></div> : <div style={{display:'grid',gridTemplateColumns:'1.08fr .92fr',gap:30,flex:1}}><div style={{...panel,padding:32}}><div style={label}>Try it locally</div><div style={{fontSize:66,fontWeight:700,lineHeight:.98,letterSpacing:'-.05em',color:p.text,marginTop:20}}>The full coaching loop, in two minutes.</div><div style={{fontSize:28,lineHeight:1.4,color:p.muted,marginTop:28}}>No glasses. No API key. The official simulator runs a scripted conversation with the same coaching loop live.</div><div style={{fontFamily:mono,color:p.mint,fontSize:22,marginTop:42}}>github.com/kolife01/lingua-lens</div></div><div><LiveConversation seconds={Math.min(18, s + 2)} compact ghost /></div></div>}</Scene>; };

const Scene: React.FC<{title: string; note?: string; children: React.ReactNode}> = ({title,note,children}) => <AbsoluteFill style={{padding:'72px 104px 70px',fontFamily:sans}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:25}}><div style={label}>{title}</div>{note?<div style={{fontFamily:mono,fontSize:14,color:p.muted}}>{note}</div>:null}</div>{children}</AbsoluteFill>;

export const LinguaLensVideo: React.FC = () => <AbsoluteFill style={{fontFamily:sans}}><Background />
  <Sequence from={0} durationInFrames={18*fps}><ColdOpen /></Sequence><Sequence from={18*fps} durationInFrames={22*fps}><Problem /></Sequence><Sequence from={40*fps} durationInFrames={12*fps}><Reveal /></Sequence><Sequence from={52*fps} durationInFrames={48*fps}><CoreDemo /></Sequence><Sequence from={100*fps} durationInFrames={40*fps}><Build /></Sequence><Sequence from={140*fps} durationInFrames={25*fps}><Close /></Sequence>
  {SCENES.map((scene,i)=><Sequence key={scene.id} from={scene.start*fps} durationInFrames={scene.duration*fps}><Audio src={staticFile(AUDIO_FILES[i])} /></Sequence>)}
</AbsoluteFill>;
