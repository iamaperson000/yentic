'use client';

import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
  useSandpackConsole,
  useErrorMessage
} from '@codesandbox/sandpack-react';
import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { SupportedLanguage } from '@/lib/project';
import { executeCode, type ExecutableLanguage } from '@/lib/runners';

type PreviewMode = 'sandpack' | 'code' | 'message' | 'runtime';

type PreviewProps = {
  files: Record<string, { code: string }>;
  activePath: string;
  template?: 'vanilla';
  mode?: 'sandpack' | 'code' | 'runtime';
  disabledMessage?: string;
  activeFileCode?: string;
  activeFileLanguage?: SupportedLanguage;
};

const runtimeLanguages = new Set<ExecutableLanguage>(['python', 'c', 'java']);

type RuntimeStatus = 'idle' | 'running' | 'ready' | 'error';

function RuntimePreview({
  code,
  language
}: {
  code: string;
  language: SupportedLanguage | undefined;
}) {
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [status, setStatus] = useState<RuntimeStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const runId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const normalizedLanguage = runtimeLanguages.has(language as ExecutableLanguage)
    ? (language as ExecutableLanguage)
    : undefined;

  const scheduleStateUpdate = useCallback((updater: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(updater);
    } else {
      window.setTimeout(updater, 0);
    }
  }, []);

  useEffect(() => {
    if (!normalizedLanguage) {
      return;
    }

    const trimmed = code.trim();
    if (!trimmed) {
      scheduleStateUpdate(() => {
        setStatus('idle');
        setStdout('');
        setStderr('');
        setErrorMessage(null);
      });
      return;
    }

    const nextId = runId.current + 1;
    runId.current = nextId;
    scheduleStateUpdate(() => {
      setStatus('running');
      setErrorMessage(null);
    });

    const timeout = window.setTimeout(async () => {
      try {
        const result = await executeCode(normalizedLanguage, trimmed);
        if (runId.current !== nextId) {
          return;
        }
        setStdout(result.stdout);
        setStderr(result.stderr);
        setStatus('ready');
      } catch (error) {
        if (runId.current !== nextId) {
          return;
        }
        setStatus('error');
        setStdout('');
        setStderr('');
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [code, normalizedLanguage, scheduleStateUpdate]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [stdout, stderr, status]);

  const isRunnable = Boolean(normalizedLanguage);
  const runtimeLabel = normalizedLanguage ? `Live Runtime · ${normalizedLanguage.toUpperCase()}` : 'Live Runtime';

  const computedStatus: RuntimeStatus = !isRunnable ? 'error' : status;
  const computedErrorMessage = !isRunnable ? 'Select a runnable file to see live output.' : errorMessage;
  const displayStdout = isRunnable ? stdout : '';
  const displayStderr = isRunnable ? stderr : '';

  const badgeClass =
    computedStatus === 'running'
      ? 'border-amber-300/50 bg-amber-400/10 text-amber-100'
      : computedStatus === 'error'
        ? 'border-rose-400/60 bg-rose-400/15 text-rose-100'
        : 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100';

  const statusLabel =
    computedStatus === 'running'
      ? 'Running…'
      : computedStatus === 'ready'
        ? 'Live'
        : computedStatus === 'error'
          ? 'Error'
          : 'Waiting';

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">{runtimeLabel}</span>
        <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.25em]', badgeClass)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {statusLabel}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col bg-[#02030c]/80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.18),_transparent_60%)]" />
        <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 text-sm text-white/80">
          {computedErrorMessage ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-rose-100">
              {computedErrorMessage}
            </div>
          ) : null}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <div className="border-b border-white/10 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
              Output
            </div>
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-white/80">
              {displayStdout ? (
                <pre className="whitespace-pre-wrap break-words">{displayStdout}</pre>
              ) : (
                <span className="text-white/40">{computedStatus === 'running' ? 'Executing…' : 'No output yet.'}</span>
              )}
            </div>
          </div>
          {displayStderr ? (
            <div className="flex flex-col overflow-hidden rounded-2xl border border-rose-400/30 bg-rose-400/10">
              <div className="border-b border-rose-400/30 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-100/80">
                Errors
              </div>
              <div className="max-h-48 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-rose-100/90">
                <pre className="whitespace-pre-wrap break-words">{displayStderr}</pre>
              </div>
            </div>
          ) : null}
          {computedStatus === 'idle' && !displayStderr && !displayStdout ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
              Start typing to see the program run automatically.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ConsoleEntryType = 'log' | 'warn' | 'error' | 'info' | 'command' | 'result';

type ConsoleEntry = {
  id: string;
  type: ConsoleEntryType;
  text: string;
};

const AsyncFunctionConstructor: (new (...args: string[]) => (...args: unknown[]) => Promise<unknown>) =
  Object.getPrototypeOf(async function () {
    /* noop */
  }).constructor;

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function formatConsoleData(data: Array<string | Record<string, string>> | undefined): string {
  if (!data || !data.length) return '';
  return data
    .map(item => {
      if (typeof item === 'string') return item;
      try {
        return Object.values(item).join(' ');
      } catch {
        return JSON.stringify(item);
      }
    })
    .join(' ');
}

function createEntryId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function LiveConsolePanel() {
  const { logs, reset } = useSandpackConsole({ resetOnPreviewRestart: true, showSyntaxError: true });
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const appendEntry = useCallback((entry: ConsoleEntry) => {
    setEntries(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    logs.forEach(item => {
      if (processedIdsRef.current.has(item.id)) {
        return;
      }
      processedIdsRef.current.add(item.id);
      if (item.method === 'clear') {
        appendEntry({ id: createEntryId('clear'), type: 'info', text: 'Console cleared' });
        return;
      }
      const text = formatConsoleData(item.data);
      if (!text) return;
      const type: ConsoleEntryType = item.method === 'error' ? 'error' : item.method === 'warning' ? 'warn' : 'log';
      appendEntry({ id: `log-${item.id}`, type, text });
    });
  }, [appendEntry, logs]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries]);

  const evaluateSnippet = async (snippet: string) => {
    const consoleProxy: Pick<Console, 'log' | 'info' | 'warn' | 'error'> = {
      log: (...args: unknown[]) => appendEntry({ id: createEntryId('log'), type: 'log', text: args.map(formatValue).join(' ') }),
      info: (...args: unknown[]) => appendEntry({ id: createEntryId('info'), type: 'info', text: args.map(formatValue).join(' ') }),
      warn: (...args: unknown[]) => appendEntry({ id: createEntryId('warn'), type: 'warn', text: args.map(formatValue).join(' ') }),
      error: (...args: unknown[]) => appendEntry({ id: createEntryId('error'), type: 'error', text: args.map(formatValue).join(' ') })
    };

    try {
      const asyncEvaluator = new AsyncFunctionConstructor(
        'console',
        'window',
        `'use strict';\nreturn await (async () => {\n${snippet}\n})();`
      );
      const result = await asyncEvaluator(consoleProxy as Console, window);
      if (result !== undefined) {
        appendEntry({ id: createEntryId('result'), type: 'result', text: formatValue(result) });
      }
    } catch (error) {
      appendEntry({
        id: createEntryId('runtime-error'),
        type: 'error',
        text: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const runCommand = async () => {
    const snippet = input.trim();
    if (!snippet) return;
    const original = input;
    appendEntry({ id: createEntryId('command'), type: 'command', text: original });
    setHistory(prev => [...prev, original]);
    setHistoryIndex(null);
    setInput('');
    await evaluateSnippet(original);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void runCommand();
      return;
    }
    if (event.key === 'ArrowUp' && !event.shiftKey) {
      event.preventDefault();
      if (!history.length) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
      return;
    }
    if (event.key === 'ArrowDown' && !event.shiftKey) {
      event.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  };

  const handleClear = () => {
    reset();
    processedIdsRef.current.clear();
    setEntries([]);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#04060f]/85 text-white/80">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">Console</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        {entries.length === 0 ? (
          <span className="text-white/45">Console output will appear here. Use the input below to run JavaScript.</span>
        ) : (
          <ul className="space-y-2">
            {entries.map(entry => {
              const baseClass =
                entry.type === 'error'
                  ? 'text-rose-200'
                  : entry.type === 'warn'
                    ? 'text-amber-200'
                    : entry.type === 'info'
                      ? 'text-white/60'
                      : entry.type === 'command'
                        ? 'text-sky-200'
                        : entry.type === 'result'
                          ? 'text-emerald-200'
                          : 'text-white/80';
              return (
                <li key={entry.id} className={clsx('whitespace-pre-wrap break-words', baseClass)}>
                  {entry.type === 'command' ? `> ${entry.text}` : entry.text}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <form
        onSubmit={event => {
          event.preventDefault();
          void runCommand();
        }}
        className="border-t border-white/10 bg-[#030512]/90 px-4 py-3"
      >
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="sr-only" htmlFor="live-console-input">
              Run JavaScript in the console
            </label>
            <textarea
              id="live-console-input"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="console.log('Hello from Yentic!')"
              className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[13px] text-white/80 placeholder:text-white/30 focus:border-emerald-300/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-400/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-300/70 hover:bg-emerald-400/30"
          >
            Run
          </button>
        </div>
      </form>
    </div>
  );
}

function SandpackPreviewPane({ isVisible }: { isVisible: boolean }) {
  const { sandpack, listen } = useSandpack();
  const errorMessage = useErrorMessage();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listen(message => {
      if (message.type === 'start') {
        setRuntimeError(null);
        setFrameError(null);
        return;
      }

      if (message.type === 'done' && !message.compilatonError) {
        setRuntimeError(null);
        return;
      }

      if (
        message.type === 'action' &&
        message.action === 'notification' &&
        message.notificationType === 'error'
      ) {
        const title = typeof message.title === 'string' ? message.title.trim() : '';
        const body =
          typeof message.message === 'string'
            ? message.message
            : typeof message.body === 'string'
              ? message.body
              : '';
        const combined = [title, body]
          .map(segment => segment.trim())
          .filter(Boolean)
          .join('\n');
        setRuntimeError(combined || 'An error occurred while running the preview.');
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [listen]);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;

    const iframe = root.querySelector('iframe');
    if (!iframe) return;

    const handleLoad = () => {
      setFrameError(null);
    };

    const handleError = () => {
      setFrameError('Preview failed to load. Please review your code for errors.');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [sandpack.activeFile, sandpack.status, errorMessage]);

  const normalizedBundlerError = errorMessage
    ?.replace(/^\[sandpack-client\]\s*/i, '')
    .trim();

  const timeoutMessage = sandpack.status === 'timeout' ? 'Preview timed out. Please try again.' : null;

  const combinedError =
    normalizedBundlerError || runtimeError || timeoutMessage || frameError || null;

  const shouldShowOverlay = Boolean(combinedError) && isVisible;

  return (
    <div
      ref={previewRef}
      className={clsx('relative flex h-full min-h-0 w-full flex-1 flex-col', !isVisible && 'hidden')}
      style={{
        height: '100%',
        minHeight: 0,
        width: '100%',
        flex: 1,
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column'
      }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        className="!flex !h-full !min-h-0 !w-full !flex-1 !flex-col !bg-transparent"
        style={{
          height: '100%',
          minHeight: 0,
          width: '100%',
          flex: 1,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      />
      {shouldShowOverlay ? (
        <div
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#05060f]/90 px-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-h-full w-full max-w-full overflow-auto">
            <div className="mx-auto flex max-w-full flex-col gap-3 rounded-2xl border border-rose-400/40 bg-rose-400/15 px-6 py-4 text-left shadow-[0_20px_60px_rgba(244,63,94,0.25)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-rose-200/80">
                Preview Error
              </span>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-rose-50/90">
                {combinedError}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Preview({
  files,
  activePath,
  template,
  mode,
  disabledMessage,
  activeFileCode,
  activeFileLanguage
}: PreviewProps) {
  const effectiveMode: PreviewMode = template ? 'sandpack' : mode ?? 'message';
  const label =
    effectiveMode === 'code' && activeFileLanguage
      ? `Live Preview · ${activeFileLanguage.toUpperCase()}`
      : 'Live Preview';

  const [activeSandpackView, setActiveSandpackView] = useState<'preview' | 'console'>('preview');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">{label}</span>
        {effectiveMode === 'sandpack' ? (
          <div className="flex items-center gap-1.5 text-white/60">
            <button
              type="button"
              onClick={() => setActiveSandpackView('preview')}
              className={clsx(
                'relative rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition',
                activeSandpackView === 'preview'
                  ? 'bg-emerald-400/90 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.4)]'
                  : 'border border-white/10 bg-transparent text-white/60 hover:border-white/25 hover:text-white/80'
              )}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveSandpackView('console')}
              className={clsx(
                'relative rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition',
                activeSandpackView === 'console'
                  ? 'bg-emerald-400/90 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.4)]'
                  : 'border border-white/10 bg-transparent text-white/60 hover:border-white/25 hover:text-white/80'
              )}
            >
              Console
            </button>
          </div>
        ) : null}
      </div>
      <div className="relative flex flex-1 min-h-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        {effectiveMode === 'sandpack' ? (
          <SandpackProvider
            files={files}
            template={template}
            options={{
              externalResources: [],
              activeFile: activePath,
              autorun: true,
              autoReload: true,
              recompileMode: 'delayed',
              recompileDelay: 300,
              showTabs: false,
              showNavigator: false,
              showConsole: true,
              showOpenInCodeSandbox: false
            }}
          >
            <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col" style={{ height: '100%', minHeight: 0 }}>
              <SandpackLayout
                className="!h-full !min-h-0 !w-full !border-none !bg-transparent !shadow-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gridTemplateRows: '1fr',
                  padding: 0,
                  gap: 0,
                  height: '100%',
                  minHeight: 0,
                  width: '100%',
                  flex: 1
                }}
              >
                <div className="flex h-full min-h-0 w-full flex-1 flex-col" style={{ height: '100%', minHeight: 0 }}>
                  <SandpackPreviewPane isVisible={activeSandpackView === 'preview'} />
                  <div
                    className={clsx(
                      'flex h-full min-h-0 w-full flex-1 flex-col',
                      activeSandpackView !== 'console' && 'hidden'
                    )}
                    style={{
                      height: '100%',
                      minHeight: 0,
                      width: '100%',
                      flex: 1,
                      display: activeSandpackView === 'console' ? 'flex' : 'none'
                    }}
                  >
                    <LiveConsolePanel />
                  </div>
                </div>
                <SandpackCodeEditor
                  className="hidden"
                  style={{
                    display: 'none'
                  }}
                />
                <SandpackCodeEditor
                  className="hidden"
                  style={{
                    display: 'none'
                  }}
                />
              </SandpackLayout>
            </div>
          </SandpackProvider>
        ) : effectiveMode === 'runtime' ? (
          <RuntimePreview code={activeFileCode ?? ''} language={activeFileLanguage} />
        ) : effectiveMode === 'code' ? (
          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="relative flex items-center justify-between border-b border-white/10 bg-[#050814]/80 px-4 py-2 text-xs text-white/60">
              <span className="truncate">{activePath.replace(/^[\/]/, '')}</span>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/50">
                Viewing
              </span>
            </div>
            <div className="relative flex-1 bg-[#02030c]/85">
              <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-[#05060f]/60 p-6 font-mono text-sm text-white/80">
                <code>{activeFileCode ?? ''}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/60">
            {disabledMessage ?? 'Preview is not available for this workspace yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
