'use client';

import { useEffect, useRef, useState } from 'react';

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

const KEYWORDS = new Set(['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from', 'class', 'with', 'as', 'and', 'or', 'not', 'None', 'True', 'False', 'lambda', 'yield', 'pass', 'break', 'continue']);
const BUILTINS = new Set(['print', 'range', 'len', 'int', 'str', 'list', 'dict']);
const COLOR: Record<string, string> = { kw: 'var(--y-kw)', str: 'var(--y-str)', fn: 'var(--y-fn)', num: 'var(--y-num)', cm: 'var(--y-muted)', fg: 'var(--y-fg)' };

function highlight(src: string): { t: string; c: string }[] {
  const out: { t: string; c: string }[] = [];
  let i = 0;
  const push = (t: string, c: string) => { if (t) out.push({ t, c }); };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '#') { let j = i; while (j < src.length && src[j] !== '\n') j++; push(src.slice(i, j), 'cm'); i = j; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1;
      while (j < src.length) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === q) { j++; break; } j++; }
      push(src.slice(i, j), 'str'); i = j; continue;
    }
    if (ch >= '0' && ch <= '9') { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; push(src.slice(i, j), 'num'); i = j; continue; }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j); const next = src[j];
      let c = 'fg';
      if (KEYWORDS.has(word)) c = 'kw';
      else if (BUILTINS.has(word)) c = 'fn';
      else if ((word === 'f' || word === 'r' || word === 'b' || word === 'rf' || word === 'fr') && (next === '"' || next === "'")) c = 'str';
      else if (next === '(') c = 'fn';
      push(word, c); i = j; continue;
    }
    push(ch, 'fg'); i++;
  }
  return out;
}

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
  const [youPtr, setYouPtr] = useState<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(false);

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
  const onWrapMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setYouPtr({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const ana = indexToRC(code, anaIndex);
  const you = youIndex == null ? null : indexToRC(code, youIndex);
  const tokens = highlight(code);
  const caretLeft = (col: number) => `calc(${PAD_X}px + ${col}ch)`;
  const caretTop = (row: number) => PAD_Y + row * LINE;

  const textStyle: React.CSSProperties = {
    margin: 0, padding: `${PAD_Y}px ${PAD_X}px`,
    fontFamily: 'var(--font-mono-code), "JetBrains Mono", ui-monospace, monospace',
    fontSize: 13, lineHeight: `${LINE}px`, whiteSpace: 'pre', tabSize: 4, border: 0,
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ minHeight: PAD_Y * 2 + LINE * 4, cursor: 'none' }}
      onMouseMove={onWrapMove}
      onMouseLeave={() => setYouPtr(null)}
    >
      {/* hidden ruler to measure glyph width */}
      <span ref={measureRef} aria-hidden style={{ ...textStyle, position: 'absolute', visibility: 'hidden', padding: 0, whiteSpace: 'pre' }}>00000000000000000000</span>

      <pre aria-hidden style={{ ...textStyle, color: 'var(--y-fg)', overflow: 'hidden' }}>
        {tokens.map((tok, idx) => (<span key={idx} style={{ color: COLOR[tok.c] }}>{tok.t}</span>))}
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
        {youPtr && <Pointer x={youPtr.x} y={youPtr.y} color="var(--y-brand)" name="you" />}
      </div>
    </div>
  );
}
