'use client';

import { useEffect, useRef, useState } from 'react';

import { executeCode } from '@/lib/runners';
import { highlightPython, PY_COLOR } from '@/lib/pyHighlight';

// A dead-simple first-look snippet: a variable and a greeting.
const INTRO = `# edit me, then hit run
name = "world"
print("hello, " + name)`;

// The real output of INTRO — shown as an on-load preview so the panel isn't a
// dead screenshot. Any edit clears it; Run executes whatever's in the editor.
const EXPECTED = `hello, world`;

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; text: string }
  | { kind: 'done'; text: string }
  | { kind: 'error'; text: string };

const PAD_X = 20;
const PAD_Y = 18;
const LINE = 22;

const textStyle: React.CSSProperties = {
  margin: 0,
  padding: `${PAD_Y}px ${PAD_X}px`,
  fontFamily: 'var(--font-mono-code), "JetBrains Mono", ui-monospace, monospace',
  fontSize: 13,
  lineHeight: `${LINE}px`,
  whiteSpace: 'pre',
  tabSize: 4,
  border: 0,
};

export default function HeroCode() {
  const [code, setCode] = useState(INTRO);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const touched = useRef(false);

  // Auto-play once on the default code: brief "running…", then the real output.
  useEffect(() => {
    const t1 = setTimeout(() => { if (!touched.current) setState({ kind: 'loading', text: 'running…' }); }, 1000);
    const t2 = setTimeout(() => { if (!touched.current) setState({ kind: 'done', text: EXPECTED }); }, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  async function run() {
    touched.current = true;
    setState({ kind: 'loading', text: 'loading the python runtime…' });
    try {
      const result = await executeCode('python', code);
      const out = (result.stdout || result.stderr || '').trimEnd();
      if (result.stderr && !result.stdout) setState({ kind: 'error', text: out || 'error' });
      else setState({ kind: 'done', text: out || '(no output)' });
    } catch (err) {
      setState({ kind: 'error', text: err instanceof Error ? err.message : 'failed to run' });
    }
  }

  const running = state.kind === 'loading';
  const tokens = highlightPython(code);
  const rows = code.split('\n').length;

  return (
    <div className="mt-10 min-w-0 overflow-hidden rounded-[11px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
      <div
        className="flex items-center justify-between border-b px-[15px] py-2 font-[family-name:var(--font-mono-code)] text-[11.5px]"
        style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
      >
        <span>main.py</span>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md px-3 py-1 font-semibold transition disabled:opacity-60"
          style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
        >
          {running ? 'running…' : '▶ run'}
        </button>
      </div>

      {/* editable code: transparent textarea over a highlighted layer */}
      <div className="relative" style={{ minHeight: PAD_Y * 2 + LINE * Math.max(rows, 4) }}>
        <pre aria-hidden style={{ ...textStyle, color: 'var(--y-fg)', overflow: 'auto' }}>
          {tokens.map((tok, idx) => (<span key={idx} style={{ color: PY_COLOR[tok.c] }}>{tok.t}</span>))}
        </pre>
        <textarea
          value={code}
          onChange={(e) => { touched.current = true; setCode(e.target.value); if (state.kind !== 'idle') setState({ kind: 'idle' }); }}
          spellCheck={false}
          aria-label="Editable Python — edit and run it"
          className="absolute inset-0 h-full w-full resize-none bg-transparent outline-none"
          style={{ ...textStyle, color: 'transparent', caretColor: 'var(--y-brand)', overflow: 'auto' }}
        />
      </div>

      <div
        className="border-t px-5 py-[13px] font-[family-name:var(--font-mono-code)] text-[12.5px]"
        style={{
          borderColor: 'var(--y-line)',
          background: 'var(--y-console-bg)',
          color: state.kind === 'error' ? 'var(--y-kw)' : 'var(--y-str)',
        }}
      >
        {state.kind === 'idle' && (
          <span style={{ color: 'var(--y-muted)' }}># press run to execute this in your browser</span>
        )}
        {state.kind === 'loading' && (
          <span style={{ color: 'var(--y-muted)' }}>
            {state.text}
            <span className="ml-1 inline-block h-[1em] w-[2px] align-[-0.15em]" style={{ background: 'var(--y-brand)', animation: 'yblink 1.05s steps(1) infinite' }} />
          </span>
        )}
        {(state.kind === 'done' || state.kind === 'error') && (
          <pre className="m-0 whitespace-pre-wrap font-[family-name:var(--font-mono-code)]">
            <span style={{ color: 'var(--y-muted)' }}>→ </span>
            {state.text}
          </pre>
        )}
      </div>
    </div>
  );
}
