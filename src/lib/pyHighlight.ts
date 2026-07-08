// Lightweight, forgiving Python tokenizer for the marketing code panels.
// Returns spans of { text, colorKey }; map colorKey through PY_COLOR.

export const PY_COLOR: Record<string, string> = {
  kw: 'var(--y-kw)',
  str: 'var(--y-str)',
  fn: 'var(--y-fn)',
  num: 'var(--y-num)',
  cm: 'var(--y-muted)',
  fg: 'var(--y-fg)',
};

const KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from',
  'class', 'with', 'as', 'and', 'or', 'not', 'None', 'True', 'False', 'lambda',
  'yield', 'pass', 'break', 'continue',
]);
const BUILTINS = new Set(['print', 'range', 'len', 'int', 'str', 'list', 'dict', 'input', 'sum', 'sorted']);

export function highlightPython(src: string): { t: string; c: string }[] {
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
