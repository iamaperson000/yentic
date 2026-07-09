import type { CSSProperties } from 'react';

const kw = { color: 'var(--y-kw)' };
const fn = { color: 'var(--y-fn)' };
const str = { color: 'var(--y-str)' };
const num = { color: 'var(--y-num)' };

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const codebg: CSSProperties = {
  position: 'absolute',
  inset: '-8%',
  fontFamily: 'var(--font-mono-code), "JetBrains Mono", ui-monospace, monospace',
  fontSize: 30,
  lineHeight: 1.7,
  fontWeight: 700,
  whiteSpace: 'pre',
  transform: 'rotate(-5deg) scale(1.12)',
  filter: 'blur(23px) saturate(1.6) brightness(1.3)',
  opacity: 0.85,
  mixBlendMode: 'screen',
  color: 'var(--y-fg)',
  pointerEvents: 'none',
};

const warm: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(52% 52% at 50% 40%,rgba(240,168,64,.24),transparent 62%),' +
    'radial-gradient(46% 44% at 15% 66%,rgba(142,224,111,.12),transparent 60%),' +
    'radial-gradient(44% 44% at 87% 24%,rgba(121,160,255,.14),transparent 60%)',
};

const grain: CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.4,
  mixBlendMode: 'overlay',
  backgroundImage: GRAIN,
};

const vign: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(85% 75% at 50% 40%,transparent 45%,rgba(10,9,13,.4) 80%,rgba(10,9,13,.72))',
};

/**
 * The B4 hero atmosphere: the site's own syntax-highlighted code blurred into a
 * warm glow field (our palette, not a borrowed gradient). Purely decorative.
 * Styles are inline so they aren't affected by CSS-layer stripping in dev.
 */
export default function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div style={codebg}>
        <span style={kw}>def</span> <span style={fn}>greet</span>(name):{'\n'}
        {'    '}<span style={kw}>return</span> <span style={str}>f&quot;hello, {'{'}name{'}'}&quot;</span>{'\n\n'}
        <span style={kw}>const</span> app = <span style={fn}>createApp</span>(){'\n'}
        app.<span style={fn}>mount</span>(<span style={str}>&quot;#root&quot;</span>){'\n\n'}
        <span style={kw}>for</span> i <span style={kw}>in</span> <span style={fn}>range</span>(<span style={num}>100</span>):{'\n'}
        {'    '}<span style={fn}>print</span>(i, i * i){'\n\n'}
        <span style={kw}>class</span> <span style={fn}>Server</span>:{'\n'}
        {'    '}<span style={kw}>def</span> <span style={fn}>start</span>(self): <span style={fn}>listen</span>(<span style={num}>3000</span>)
      </div>
      <div style={warm} />
      <div style={grain} />
      <div style={vign} />
    </div>
  );
}
