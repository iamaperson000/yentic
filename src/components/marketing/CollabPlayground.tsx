'use client';

import { useEffect, useRef, useState } from 'react';

const BASE = `def greet(name):
    return f"welcome, {name}"

print(greet("team"))`;

const PAD_X = 20;
const PAD_Y = 16;
const LINE = 26; // px, matches font-size 13 / line-height 2

// A sensible, looping edit script for the "ana" bot. Each edit reverts later
// so the buffer never drifts into nonsense. `find` is located live, so it
// stays resilient if the human has also been editing.
type Step =
  | { kind: 'move'; find: string }
  | { kind: 'edit'; find: string; to: string }
  | { kind: 'pause' };

const SCRIPT: Step[] = [
  { kind: 'move', find: 'greet' },
  { kind: 'edit', find: '"team"', to: '"everyone"' },
  { kind: 'move', find: 'name' },
  { kind: 'edit', find: 'welcome', to: 'hello there' },
  { kind: 'pause' },
  { kind: 'edit', find: 'hello there', to: 'welcome' },
  { kind: 'edit', find: '"everyone"', to: '"team"' },
  { kind: 'pause' },
];

const KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from',
  'class', 'with', 'as', 'and', 'or', 'not', 'None', 'True', 'False', 'lambda',
  'yield', 'pass', 'break', 'continue',
]);
const BUILTINS = new Set(['print', 'range', 'len', 'int', 'str', 'list', 'dict']);

const COLOR: Record<string, string> = {
  kw: 'var(--y-kw)', str: 'var(--y-str)', fn: 'var(--y-fn)',
  num: 'var(--y-num)', cm: 'var(--y-muted)', fg: 'var(--y-fg)',
};

function highlight(src: string): { t: string; c: string }[] {
  const out: { t: string; c: string }[] = [];
  let i = 0;
  const push = (t: string, c: string) => { if (t) out.push({ t, c }); };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '#') {
      let j = i;
      while (j < src.length && src[j] !== '\n') j++;
      push(src.slice(i, j), 'cm'); i = j; continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === q) { j++; break; }
        j++;
      }
      push(src.slice(i, j), 'str'); i = j; continue;
    }
    if (ch >= '0' && ch <= '9') {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      push(src.slice(i, j), 'num'); i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const next = src[j];
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

export default function CollabPlayground() {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [code, setCode] = useState(BASE);
  const [anaIndex, setAnaIndex] = useState(4);
  const [youIndex, setYouIndex] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  const codeRef = useRef(code);
  const activeRef = useRef(active);
  const cancelled = useRef(false);

  const applyCode = (next: string) => { codeRef.current = next; setCode(next); };
  const setActiveNow = (v: boolean) => { activeRef.current = v; setActive(v); };

  useEffect(() => {
    cancelled.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => { timers.push(setTimeout(res, ms)); });

    async function moveTo(index: number) {
      setAnaIndex(index);
      await sleep(500);
    }

    async function edit(find: string, to: string) {
      if (activeRef.current) return;
      const start = codeRef.current.indexOf(find);
      if (start === -1) return; // human changed it — skip, stay sensible
      await moveTo(start + find.length);
      await sleep(220);
      if (cancelled.current || activeRef.current) return;

      // Re-read the live buffer right before writing so we never clobber the
      // human's edits made during the move.
      const src = codeRef.current;
      const at = src.indexOf(find);
      if (at === -1) return;
      const head = src.slice(0, at);
      const tail = src.slice(at + find.length);
      applyCode(head + tail); // delete the token
      setAnaIndex(at);
      await sleep(160);
      // type the replacement, char by char — yield instantly if the human jumps in
      let typed = '';
      for (const ch of to) {
        if (cancelled.current || activeRef.current) return;
        typed += ch;
        applyCode(head + typed + tail);
        setAnaIndex(at + typed.length);
        await sleep(58);
      }
      await sleep(260);
    }

    async function loop() {
      // let the panel settle before the first move
      await sleep(900);
      while (!cancelled.current) {
        for (const step of SCRIPT) {
          if (cancelled.current) return;
          // don't fight the human: hold edits while they're active
          if (step.kind === 'edit' && activeRef.current) { await sleep(700); continue; }
          if (step.kind === 'move') {
            const at = codeRef.current.indexOf(step.find);
            if (at !== -1) await moveTo(at + step.find.length);
          } else if (step.kind === 'edit') {
            await edit(step.find, step.to);
          } else {
            await sleep(900);
          }
        }
      }
    }

    void loop();
    return () => {
      cancelled.current = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const syncYou = () => {
    const ta = taRef.current;
    if (ta) setYouIndex(ta.selectionStart);
  };

  const ana = indexToRC(code, anaIndex);
  const you = youIndex == null ? null : indexToRC(code, youIndex);
  const tokens = highlight(code);

  const caretLeft = (col: number) => `calc(${PAD_X}px + ${col}ch)`;
  const caretTop = (row: number) => PAD_Y + row * LINE;

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

  return (
    <div className="relative" style={{ minHeight: PAD_Y * 2 + LINE * 4 }}>
      {/* highlighted layer */}
      <pre aria-hidden style={{ ...textStyle, color: 'var(--y-fg)', overflow: 'hidden' }}>
        {tokens.map((tok, idx) => (
          <span key={idx} style={{ color: COLOR[tok.c] }}>{tok.t}</span>
        ))}
      </pre>

      {/* real editable surface (transparent text + caret) */}
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
        style={{ ...textStyle, color: 'transparent', caretColor: 'transparent' }}
      />

      {/* cursors */}
      <div className="pointer-events-none absolute inset-0">
        {/* ana (bot) */}
        <span
          className="absolute rounded-sm"
          style={{ left: caretLeft(ana.col), top: caretTop(ana.row), width: 2, height: 16, background: 'var(--y-str)', transition: 'left .22s ease, top .22s ease' }}
        />
        <span
          className="absolute rounded px-1.5 py-0.5 text-[11px] font-[family-name:var(--font-mono-code)]"
          style={{ left: caretLeft(ana.col), top: caretTop(ana.row) - 18, background: 'var(--y-str)', color: 'var(--y-statfg)', transform: 'translateX(1px)', transition: 'left .22s ease, top .22s ease' }}
        >
          ana
        </span>

        {/* you (only once the human has clicked in) */}
        {you && (
          <>
            <span
              className="absolute rounded-sm"
              style={{ left: caretLeft(you.col), top: caretTop(you.row), width: 2, height: 16, background: 'var(--y-brand)' }}
            />
            <span
              className="absolute rounded px-1.5 py-0.5 text-[11px] font-[family-name:var(--font-mono-code)]"
              style={{ left: caretLeft(you.col), top: caretTop(you.row) - 18, background: 'var(--y-brand)', color: 'var(--y-statfg)', transform: 'translateX(1px)' }}
            >
              you
            </span>
          </>
        )}
      </div>
    </div>
  );
}
