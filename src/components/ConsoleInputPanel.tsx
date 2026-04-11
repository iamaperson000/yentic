'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from 'react';

export type ConsoleInputPanelProps = {
  value: string;
  onChange: (value: string) => void;
};

function computeConsoleValue(lines: string[]): string {
  if (!lines.length) {
    return '';
  }
  return `${lines.join('\n')}\n`;
}

function parseConsoleHistory(value: string): string[] {
  if (!value) {
    return [];
  }
  const trimmed = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (!trimmed) {
    return [''];
  }
  return trimmed.split('\n');
}

export function ConsoleInputPanel({ value, onChange }: ConsoleInputPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const history = useMemo(() => parseConsoleHistory(value), [value]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [history]);

  const commitDraft = useCallback(() => {
    if (draft.length === 0) {
      return;
    }
    const normalized = draft.replace(/\r\n/g, '\n');
    const nextHistory = [...history, normalized];
    onChange(computeConsoleValue(nextHistory));
    setDraft('');
  }, [draft, history, onChange]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      commitDraft();
    },
    [commitDraft]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        commitDraft();
      }
    },
    [commitDraft]
  );

  const handleReset = useCallback(() => {
    setDraft('');
    onChange('');
  }, [onChange]);

  return (
    <div className="flex flex-col overflow-hidden border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
      <div className="flex items-center justify-between border-b border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">
        <span>Interactive Input</span>
        <button
          type="button"
          onClick={handleReset}
          className="border border-[var(--ide-border)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ide-text-faint)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
        >
          Clear
        </button>
      </div>
      <div
        ref={listRef}
        className="flex-1 space-y-2 overflow-auto px-3 py-3 font-mono text-[13px] leading-relaxed text-[var(--ide-text)]"
      >
        {history.length ? (
          history.map((line, index) => (
            <div key={`console-line-${index}`} className="flex items-start gap-3">
              <span className="mt-[2px] text-[var(--ide-text-faint)]">&gt;</span>
              {line ? (
                <pre className="flex-1 whitespace-pre-wrap break-words">{line}</pre>
              ) : (
                <span className="flex-1 italic text-[var(--ide-text-faint)]">[blank line]</span>
              )}
            </div>
          ))
        ) : (
          <p className="text-[var(--ide-text-faint)]">Type input and press Enter to queue it for your next run.</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-3">
        <label className="flex items-start gap-3">
          <span className="mt-2 text-[var(--ide-text-faint)]">&gt;</span>
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="min-h-[52px] flex-1 resize-y overflow-hidden border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2 font-mono text-[13px] leading-relaxed text-[var(--ide-text)] outline-none placeholder:text-[var(--ide-text-faint)]"
            placeholder="Write a line of input and press Enter to enqueue it"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ide-text-faint)]">
          <span>Press Enter to queue · Shift+Enter for newline</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="border border-[var(--ide-border)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ide-text-faint)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
            >
              Reset
            </button>
            <button
              type="submit"
              className="border border-[#2d7d46] bg-[#1f4d2e] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#d4f7dc] transition hover:border-[#399c58] hover:bg-[#256338]"
            >
              Queue Line
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
