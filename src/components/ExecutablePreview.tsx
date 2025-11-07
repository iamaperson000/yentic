'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ExecutableLanguage } from '@/lib/runners';
import { executeCode } from '@/lib/runners';

type ExecutablePreviewProps = {
  code: string;
  language: ExecutableLanguage;
  path: string;
};

type RunState =
  | { status: 'idle'; output: string; error: string }
  | { status: 'running'; output: string; error: string }
  | { status: 'ready'; output: string; error: string };

const RUN_DEBOUNCE_MS = 600;

export function ExecutablePreview({ code, language, path }: ExecutablePreviewProps) {
  const [state, setState] = useState<RunState>({ status: 'idle', output: '', error: '' });
  const [autoRun, setAutoRun] = useState(true);
  const [stdinValue, setStdinValue] = useState('');
  const latestCode = useRef(code);
  const latestInput = useRef(stdinValue);
  const pendingRun = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = useMemo(() => {
    switch (language) {
      case 'python':
        return 'Python Runner';
      case 'c':
        return 'C Runner';
      case 'java':
        return 'Java Runner';
      default:
        return 'Runner';
    }
  }, [language]);

  const run = useCallback(
    async (source: string, input: string) => {
      if (!source.trim()) {
        setState({ status: 'idle', output: '', error: '' });
        return;
      }
      setState(prev => ({ status: 'running', output: prev.output, error: '' }));
      try {
        const result = await executeCode(language, source, input);
        const output = result.stdout.trimEnd();
        const error = result.stderr.trimEnd();
        setState({ status: 'ready', output, error });
      } catch (error) {
        setState({
          status: 'ready',
          output: '',
          error: error instanceof Error ? error.message : 'An unknown error occurred.'
        });
      }
    },
    [language]
  );

  const runLatest = useCallback(() => {
    if (pendingRun.current) {
      clearTimeout(pendingRun.current);
      pendingRun.current = null;
    }
    latestCode.current = code;
    latestInput.current = stdinValue;
    void run(code, stdinValue);
  }, [code, run, stdinValue]);

  useEffect(() => {
    latestCode.current = code;
    latestInput.current = stdinValue;
    if (!autoRun) {
      if (pendingRun.current) {
        clearTimeout(pendingRun.current);
        pendingRun.current = null;
      }
      return;
    }
    if (pendingRun.current) {
      clearTimeout(pendingRun.current);
    }
    pendingRun.current = setTimeout(() => {
      pendingRun.current = null;
      void run(latestCode.current, latestInput.current);
    }, RUN_DEBOUNCE_MS);
    return () => {
      if (pendingRun.current) {
        clearTimeout(pendingRun.current);
        pendingRun.current = null;
      }
    };
  }, [autoRun, code, run, stdinValue]);

  const statusLabel = state.status === 'running' ? 'Running…' : state.status === 'ready' ? 'Output' : 'Idle';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#050814]/80 px-4 py-2 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/50">
            {label}
          </span>
          <span className="truncate text-white/70">{path.replace(/^[\/]/, '')}</span>
        </div>
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/45">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400"
            checked={autoRun}
            onChange={event => setAutoRun(event.target.checked)}
          />
          Auto-run
        </label>
        <button
          type="button"
          onClick={runLatest}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-300/20"
        >
          Run now
        </button>
      </div>
    </div>
    <div className="flex-1 bg-[#02030c]/85">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/45">
          <span>{statusLabel}</span>
          {state.status === 'running' && (
            <span className="animate-pulse text-white/50">Processing…</span>
          )}
        </div>
        <div className="flex h-full flex-col gap-3 overflow-auto p-4 text-sm text-white/80">
          <div className="rounded-2xl border border-white/10 bg-black/40">
            <div className="border-b border-white/10 bg-black/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              Standard Input
            </div>
            <textarea
              value={stdinValue}
              onChange={event => setStdinValue(event.target.value)}
              className="min-h-[72px] w-full bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-white/80 outline-none placeholder:text-white/30"
              placeholder="Provide input that your program reads from stdin…"
            />
          </div>
          {state.output && (
            <pre className="whitespace-pre-wrap break-words text-emerald-100/90">{state.output || ' '}</pre>
          )}
            {state.error && (
              <pre className="whitespace-pre-wrap break-words text-rose-200/90">{state.error}</pre>
            )}
            {!state.output && !state.error && (
              <p className="text-white/45">No output yet. Make a change or run the code to see results.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
