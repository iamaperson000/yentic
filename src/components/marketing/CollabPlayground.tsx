'use client';

import { useEffect, useRef, useState } from 'react';

import { highlightPython, PY_COLOR } from '@/lib/pyHighlight';

const BASE = `def greet(name):
    return f"welcome, {name}"

print(greet("team"))`;

const PAD_X = 20;
const PAD_Y = 16;
const LINE = 26; // px, matches font-size 13 / line-height 2
const CHAR = 7.83; // px width of one monospace glyph at 13px (measured, refined on mount)

type Step =
  | { kind: 'hover'; find: string }
  | { kind: 'edit'; find: string; to: string }
  | { kind: 'pause' };

// Sensible, self-reverting loop so the buffer never drifts into nonsense.
const SCRIPT: Step[] = [
  { kind: 'hover', find: 'def' },
  { kind: 'hover', find: 'return' },
  { kind: 'edit', find: '"team"', to: '"everyone"' },
  { kind: 'hover', find: 'name' },
  { kind: 'edit', find: 'welcome', to: 'hello there' },
  { kind: 'pause' },
  { kind: 'edit', find: 'hello there', to: 'welcome' },
  { kind: 'edit', find: '"everyone"', to: '"team"' },
  { kind: 'pause' },
];

function indexToRC(src: string, index: number) {
  const before = src.slice(0, Math.max(0, Math.min(index, src.length)));
  const nl = before.lastIndexOf('\n');
  const row = (before.match(/\n/g) || []).length;
  const col = nl === -1 ? before.length : before.length - nl - 1;
  return { row, col };
}

function Pointer({ x, y, color, name, pulse }: { x: number; y: number; color: string; name: string; pulse?: boolean }) {
  return (
    <div
      className="absolute z-10"
      style={{
        left: x, top: y,
        transform: `scale(${pulse ? 0.8 : 1})`,
        transformOrigin: 'top left',
        transition: 'left .34s cubic-bezier(.4,0,.2,1), top .34s cubic-bezier(.4,0,.2,1), transform .12s ease',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
        <path d="M4 3 L4 18.5 L8.2 14.4 L11 20.5 L13.4 19.4 L10.6 13.4 L16.4 13.4 Z" fill={color} stroke="#0c0a10" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span
        className="absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold font-[family-name:var(--font-mono-code)]"
        style={{ left: 13, top: 13, background: color, color: 'var(--y-statfg)' }}
      >
        {name}
      </span>
    </div>
  );
}

export default function CollabPlayground() {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [code, setCode] = useState(BASE);
  const [anaIndex, setAnaIndex] = useState(4);
  const [anaPtr, setAnaPtr] = useState({ x: PAD_X, y: PAD_Y });
  const [anaPulse, setAnaPulse] = useState(false);
  const [youIndex, setYouIndex] = useState<number | null>(null);
  const youPtrRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [hovering, setHovering] = useState(false);

  const codeRef = useRef(code);
  const activeRef = useRef(active);
  const cancelled = useRef(false);
  const charRef = useRef(CHAR);

  const applyCode = (next: string) => { codeRef.current = next; setCode(next); };
  const setActiveNow = (v: boolean) => { activeRef.current = v; setActive(v); };

  useEffect(() => {
    if (measureRef.current) charRef.current = measureRef.current.getBoundingClientRect().width / 20 || CHAR;
  }, []);

  const caretXY = (index: number) => {
    const { row, col } = indexToRC(codeRef.current, index);
    return { x: PAD_X + col * charRef.current, y: PAD_Y + row * LINE };
  };

  useEffect(() => {
    cancelled.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) => new Promise<void>((res) => { timers.push(setTimeout(res, ms)); });

    const click = () => { setAnaPulse(true); timers.push(setTimeout(() => setAnaPulse(false), 130)); };

    async function edit(find: string, to: string) {
      if (activeRef.current) return;
      const found = codeRef.current.indexOf(find);
      if (found === -1) return;
      // glide the pointer to the token and "click"
      setAnaPtr(caretXY(found));
      await sleep(420);
      if (cancelled.current || activeRef.current) return;
      click();
      // re-read live buffer right before writing so human edits are never clobbered
      const src = codeRef.current;
      const at = src.indexOf(find);
      if (at === -1) return;
      const head = src.slice(0, at);
      const tail = src.slice(at + find.length);
      applyCode(head + tail);
      setAnaIndex(at);
      await sleep(180);
      let typed = '';
      for (const ch of to) {
        if (cancelled.current || activeRef.current) return;
        typed += ch;
        applyCode(head + typed + tail);
        setAnaIndex(at + typed.length);
        setAnaPtr(caretXY(at + typed.length));
        await sleep(58);
      }
      await sleep(240);
    }

    async function loop() {
      await sleep(800);
      while (!cancelled.current) {
        for (const step of SCRIPT) {
          if (cancelled.current) return;
          if (step.kind === 'edit' && activeRef.current) { await sleep(700); continue; }
          if (step.kind === 'hover') {
            const at = codeRef.current.indexOf(step.find);
            if (at !== -1) { setAnaPtr(caretXY(at)); await sleep(500); click(); await sleep(500); }
          } else if (step.kind === 'edit') {
            await edit(step.find, step.to);
          } else {
            await sleep(900);
          }
        }
      }
    }

    void loop();
    return () => { cancelled.current = true; timers.forEach(clearTimeout); };
  }, []);

  const syncYou = () => { const ta = taRef.current; if (ta) setYouIndex(ta.selectionStart); };
  // Drive the "you" pointer imperatively — no React re-render on mousemove, no
  // transition, so it stays pinned to the cursor instead of lagging behind it.
  const onWrapMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const el = youPtrRef.current;
    if (rect && el) {
      el.style.left = `${e.clientX - rect.left}px`;
      el.style.top = `${e.clientY - rect.top}px`;
      el.style.display = 'block';
    }
  };
  const hideYou = () => { if (youPtrRef.current) youPtrRef.current.style.display = 'none'; };

  const ana = indexToRC(code, anaIndex);
  const you = youIndex == null ? null : indexToRC(code, youIndex);
  const tokens = highlightPython(code);
  // ana is always here; you count as online once you're actually in the panel.
  const online = hovering || active ? 2 : 1;
  const caretLeft = (col: number) => `calc(${PAD_X}px + ${col}ch)`;
  const caretTop = (row: number) => PAD_Y + row * LINE;

  const textStyle: React.CSSProperties = {
    margin: 0, padding: `${PAD_Y}px ${PAD_X}px`,
    fontFamily: 'var(--font-mono-code), "JetBrains Mono", ui-monospace, monospace',
    fontSize: 13, lineHeight: `${LINE}px`, whiteSpace: 'pre', tabSize: 4, border: 0,
  };

  return (
    <div className="overflow-hidden rounded-[11px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
      <div
        className="flex items-center justify-between border-b px-4 py-2 font-[family-name:var(--font-mono-code)] text-[11.5px]"
        style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
      >
        <span>greet.py</span>
        <span className="flex items-center gap-1.5" style={{ transition: 'color .2s' }}>
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: 'var(--y-str)' }} />
          {online} online
        </span>
      </div>

      <div
        ref={wrapRef}
        className="relative"
        style={{ minHeight: PAD_Y * 2 + LINE * 4, cursor: 'none' }}
        onMouseEnter={() => setHovering(true)}
        onMouseMove={onWrapMove}
        onMouseLeave={() => { setHovering(false); hideYou(); }}
      >
      {/* hidden ruler to measure glyph width */}
      <span ref={measureRef} aria-hidden style={{ ...textStyle, position: 'absolute', visibility: 'hidden', padding: 0, whiteSpace: 'pre' }}>00000000000000000000</span>

      <pre aria-hidden style={{ ...textStyle, color: 'var(--y-fg)', overflow: 'hidden' }}>
        {tokens.map((tok, idx) => (<span key={idx} style={{ color: PY_COLOR[tok.c] }}>{tok.t}</span>))}
      </pre>

      <textarea
        ref={taRef}
        value={code}
        onChange={(e) => { activeRef.current = true; applyCode(e.target.value); setYouIndex(e.target.selectionStart); }}
        onKeyUp={syncYou}
        onClick={syncYou}
        onSelect={syncYou}
        onFocus={() => { setActiveNow(true); syncYou(); }}
        onBlur={() => setActiveNow(false)}
        spellCheck={false}
        aria-label="Try editing — you're editing alongside ana"
        className="absolute inset-0 h-full w-full resize-none bg-transparent outline-none"
        style={{ ...textStyle, color: 'transparent', caretColor: 'transparent', cursor: 'none' }}
      />

      {/* thin edit-carets (no labels — the name rides the pointer) */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute rounded-sm" style={{ left: caretLeft(ana.col), top: caretTop(ana.row), width: 2, height: 16, background: 'var(--y-str)', transition: 'left .12s ease, top .12s ease' }} />
        {you && <span className="absolute rounded-sm" style={{ left: caretLeft(you.col), top: caretTop(you.row), width: 2, height: 16, background: 'var(--y-brand)' }} />}

        {/* floating presence cursors */}
        <Pointer x={anaPtr.x} y={anaPtr.y} color="var(--y-str)" name="ana" pulse={anaPulse} />

        {/* "you" pointer: positioned imperatively for zero lag */}
        <div ref={youPtrRef} className="absolute z-10" style={{ left: 0, top: 0, display: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
            <path d="M4 3 L4 18.5 L8.2 14.4 L11 20.5 L13.4 19.4 L10.6 13.4 L16.4 13.4 Z" fill="var(--y-brand)" stroke="#0c0a10" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <span
            className="absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold font-[family-name:var(--font-mono-code)]"
            style={{ left: 13, top: 13, background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
          >
            you
          </span>
        </div>
      </div>
      </div>

      <div
        className="flex items-center gap-2 border-t px-4 py-2 font-[family-name:var(--font-mono-code)] text-[11px]"
        style={{ borderColor: 'var(--y-line)', background: 'var(--y-console-bg)', color: 'var(--y-muted)' }}
      >
        <span className="h-[6px] w-[6px] rounded-full" style={{ background: 'var(--y-str)' }} />
        live · synced
      </div>
    </div>
  );
}
