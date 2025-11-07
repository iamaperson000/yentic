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
import { ConsoleInputPanel } from '@/components/ConsoleInputPanel';
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

const runtimeLanguages = new Set<ExecutableLanguage>(['python', 'c', 'cpp', 'java']);

const consoleInputLanguages = new Set<ExecutableLanguage>(['python']);

const textareaInputLanguages = new Set<ExecutableLanguage>(['c', 'cpp', 'java']);

type RuntimeStatus = 'idle' | 'running' | 'ready' | 'error';

type SandpackErrorNotification = {
  title?: unknown;
  message?: unknown;
  body?: unknown;
};

function RuntimePreview({
  code,
  language,
  autorunEnabled,
  runRequestId
}: {
  code: string;
  language: SupportedLanguage | undefined;
  autorunEnabled: boolean;
  runRequestId: number;
}) {
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [status, setStatus] = useState<RuntimeStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const [consoleInputs, setConsoleInputs] = useState<Partial<Record<ExecutableLanguage, string>>>({});
  const [textInputs, setTextInputs] = useState<Partial<Record<ExecutableLanguage, string>>>({});
  const runId = useRef(0);
  const lastProcessedRun = useRef<number>(0);
  const lastExecutedSource = useRef<string>('');
  const lastExecutedInput = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const normalizedLanguage = runtimeLanguages.has(language as ExecutableLanguage)
    ? (language as ExecutableLanguage)
    : undefined;

  const supportsConsoleInput =
    normalizedLanguage !== undefined && consoleInputLanguages.has(normalizedLanguage);
  const supportsTextareaInput =
    normalizedLanguage !== undefined && textareaInputLanguages.has(normalizedLanguage);
  const supportsAnyInput = supportsConsoleInput || supportsTextareaInput;

  const consoleInputValue = supportsConsoleInput
    ? (normalizedLanguage ? consoleInputs[normalizedLanguage] ?? '' : '')
    : '';
  const textInputValue = supportsTextareaInput
    ? (normalizedLanguage ? textInputs[normalizedLanguage] ?? '' : '')
    : '';
  const effectiveInput = supportsConsoleInput
    ? consoleInputValue
    : supportsTextareaInput
      ? textInputValue
      : '';

  const scheduleStateUpdate = useCallback((updater: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(updater);
    } else {
      window.setTimeout(updater, 0);
    }
  }, []);

  const enqueueExecution = useCallback(
    (trimmed: string, inputSnapshot: string): (() => void) | undefined => {
      if (!normalizedLanguage) {
        return undefined;
      }

      const nextId = runId.current + 1;
      runId.current = nextId;

      if (!trimmed) {
        lastExecutedSource.current = '';
        lastExecutedInput.current = inputSnapshot;
        scheduleStateUpdate(() => {
          setStatus('idle');
          setStdout('');
          setStderr('');
          setErrorMessage(null);
          setHasPendingChanges(false);
        });
        return undefined;
      }

      lastExecutedSource.current = trimmed;
      lastExecutedInput.current = inputSnapshot;

      scheduleStateUpdate(() => {
        setStatus('running');
        setErrorMessage(null);
      });

      const timeout = window.setTimeout(async () => {
        try {
          const result = await executeCode(normalizedLanguage, trimmed, inputSnapshot);
          if (runId.current !== nextId) {
            return;
          }
          setStdout(result.stdout);
          setStderr(result.stderr);
          setStatus(result.stderr ? 'error' : 'ready');
          setHasPendingChanges(false);
        } catch (error) {
          if (runId.current !== nextId) {
            return;
          }
          setStatus('error');
          setStdout('');
          setStderr('');
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setHasPendingChanges(false);
        }
      }, 150);

      return () => {
        window.clearTimeout(timeout);
      };
    },
    [normalizedLanguage, scheduleStateUpdate]
  );

  useEffect(() => {
    if (!normalizedLanguage) {
      scheduleStateUpdate(() => {
        setHasPendingChanges(false);
      });
      lastExecutedSource.current = '';
      lastExecutedInput.current = '';
      return;
    }

    if (autorunEnabled) {
      scheduleStateUpdate(() => {
        setHasPendingChanges(false);
      });
      return;
    }

    const trimmed = code.trim();
    const inputSnapshot = supportsAnyInput ? effectiveInput : '';
    scheduleStateUpdate(() => {
      setHasPendingChanges(
        trimmed !== lastExecutedSource.current || inputSnapshot !== lastExecutedInput.current
      );
    });
  }, [autorunEnabled, code, effectiveInput, normalizedLanguage, scheduleStateUpdate, supportsAnyInput]);

  useEffect(() => {
    if (!normalizedLanguage) {
      lastProcessedRun.current = runRequestId;
      return;
    }

    if (autorunEnabled) {
      lastProcessedRun.current = runRequestId;
      return;
    }

    if (runRequestId === 0 || runRequestId === lastProcessedRun.current) {
      return;
    }

    lastProcessedRun.current = runRequestId;

    const trimmed = code.trim();
    const inputSnapshot = supportsAnyInput ? effectiveInput : '';
    return enqueueExecution(trimmed, inputSnapshot);
  }, [autorunEnabled, code, effectiveInput, enqueueExecution, normalizedLanguage, runRequestId, supportsAnyInput]);

  useEffect(() => {
    if (!normalizedLanguage || !autorunEnabled) {
      return;
    }

    lastProcessedRun.current = runRequestId;

    const trimmed = code.trim();
    const inputSnapshot = supportsAnyInput ? effectiveInput : '';
    if (
      trimmed === lastExecutedSource.current &&
      inputSnapshot === lastExecutedInput.current
    ) {
      return;
    }

    return enqueueExecution(trimmed, inputSnapshot);
  }, [autorunEnabled, code, effectiveInput, enqueueExecution, normalizedLanguage, runRequestId, supportsAnyInput]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [stdout, stderr, status]);

  const isRunnable = Boolean(normalizedLanguage);
  const supportsStandardInput = supportsTextareaInput;
  const runtimeLabel = normalizedLanguage ? `Live Runtime · ${normalizedLanguage.toUpperCase()}` : 'Live Runtime';

  const computedStatus: RuntimeStatus = !isRunnable ? 'error' : status;
  const computedErrorMessage = !isRunnable ? 'Select a runnable file to see live output.' : errorMessage;
  const displayStdout = isRunnable ? stdout : '';
  const displayStderr = isRunnable ? stderr : '';

  const idleHint = autorunEnabled
    ? 'Waiting for code changes to run automatically.'
    : hasPendingChanges
      ? 'Code changed since your last run. Press Run to update the output.'
      : 'Press Run to execute your program.';

  const badgeClass =
    computedStatus === 'running'
      ? 'border border-amber-300/60 bg-amber-400/15 text-amber-100'
      : computedStatus === 'error'
        ? 'border border-rose-400/50 bg-rose-500/15 text-rose-100'
        : 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-100';

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
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">{runtimeLabel}</span>
        <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.25em]', badgeClass)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {statusLabel}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col bg-black/50">
        <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 text-sm text-white/80">
          {!autorunEnabled && hasPendingChanges ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Code changed since your last run. Press Run to update the output.
            </div>
          ) : null}
          {computedErrorMessage ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-rose-100">
              {computedErrorMessage}
            </div>
          ) : null}
          {supportsConsoleInput ? (
            <ConsoleInputPanel
              key={normalizedLanguage ?? 'runtime-console'}
              value={consoleInputValue}
              onChange={nextValue =>
                normalizedLanguage
                  ? setConsoleInputs(previous => ({ ...previous, [normalizedLanguage]: nextValue }))
                  : void 0
              }
            />
          ) : supportsStandardInput ? (
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <div className="border-b border-white/10 bg-black/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Standard Input
              </div>
              <textarea
                value={textInputValue}
                onChange={event =>
                  normalizedLanguage
                    ? setTextInputs(previous => ({ ...previous, [normalizedLanguage]: event.target.value }))
                    : void 0
                }
                className="min-h-[80px] flex-1 bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-white/80 outline-none placeholder:text-white/30"
                placeholder="Provide input for scanf or other stdin reads…"
              />
              <div className="border-t border-white/5 bg-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white/30">
                Passed to program via stdin before execution
              </div>
            </div>
          ) : null}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <div className="border-b border-white/10 bg-black/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
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
            <div className="flex flex-col overflow-hidden rounded-2xl border border-rose-400/40 bg-rose-500/15">
              <div className="border-b border-rose-400/40 bg-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-100/85">
                Errors
              </div>
              <div className="max-h-48 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-rose-100/90">
                <pre className="whitespace-pre-wrap break-words">{displayStderr}</pre>
              </div>
            </div>
          ) : null}
          {computedStatus === 'idle' && !displayStderr && !displayStdout ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/60">
              {idleHint}
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
      const method = item.method as string;
      const type: ConsoleEntryType =
        method === 'error'
          ? 'error'
          : method === 'warn' || method === 'warning'
          ? 'warn'
          : 'log';
      

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
    <div className="flex h-full min-h-0 flex-1 flex-col bg-black/50 text-white/80">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">Console</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        {entries.length === 0 ? (
          <span className="text-white/40">Console output will appear here. Use the input below to run JavaScript.</span>
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
        className="border-t border-white/10 bg-black/40 px-4 py-3"
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
              className="h-24 w-full resize-none rounded-2xl border border-white/20 bg-black/50 px-3 py-2 font-mono text-[13px] text-white/80 placeholder:text-white/40 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
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
        const notification = message as SandpackErrorNotification;
        const title = typeof notification.title === 'string' ? notification.title.trim() : '';
        const body =
          typeof notification.message === 'string'
            ? notification.message
            : typeof notification.body === 'string'
              ? notification.body
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
        flex: '1 1 auto',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        maxWidth: 'none'
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
          boxShadow: 'none',
          maxWidth: 'none'
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

function SandpackManualRunner({
  autorunEnabled,
  runRequestId
}: {
  autorunEnabled: boolean;
  runRequestId: number;
}) {
  const { sandpack } = useSandpack();
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    if (autorunEnabled) {
      lastRunRef.current = runRequestId;
    }
  }, [autorunEnabled, runRequestId]);

  useEffect(() => {
    if (autorunEnabled) {
      return;
    }
    if (runRequestId === 0 || runRequestId === lastRunRef.current) {
      return;
    }
    lastRunRef.current = runRequestId;
    const run = sandpack?.runSandpack;
    if (typeof run === 'function') {
      run();
    }
  }, [autorunEnabled, runRequestId, sandpack]);

  return null;
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
  const supportsAutorun = effectiveMode === 'sandpack' || effectiveMode === 'runtime';
  const [autorunEnabled, setAutorunEnabled] = useState<boolean>(false);
  const [runRequestId, setRunRequestId] = useState<number>(0);

  const schedulePreviewUpdate = useCallback((updater: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(updater);
    } else {
      window.setTimeout(updater, 0);
    }
  }, []);

  useEffect(() => {
    if (!supportsAutorun) {
      schedulePreviewUpdate(() => {
        setAutorunEnabled(prev => (prev ? false : prev));
        setRunRequestId(prev => (prev !== 0 ? 0 : prev));
      });
    }
  }, [schedulePreviewUpdate, supportsAutorun]);

  useEffect(() => {
    if (!supportsAutorun || !autorunEnabled) {
      return;
    }
    schedulePreviewUpdate(() => {
      setRunRequestId(previous => previous + 1);
    });
  }, [supportsAutorun, autorunEnabled, activeFileCode, activeFileLanguage, activePath, effectiveMode, schedulePreviewUpdate]);

  const triggerRun = useCallback(() => {
    if (!supportsAutorun) return;
    setRunRequestId(previous => previous + 1);
  }, [supportsAutorun]);

  const toggleAutorun = useCallback(() => {
    setAutorunEnabled(prev => !prev);
  }, []);

  const showAutorunControls = supportsAutorun;
  const showRunButton = showAutorunControls && !autorunEnabled;

  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">{label}</span>
          {effectiveMode === 'sandpack' ? (
            <div className="flex items-center gap-1.5 text-white/60">
              <button
                type="button"
                onClick={() => setActiveSandpackView('preview')}
                className={clsx(
                  'relative rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition',
                  activeSandpackView === 'preview'
                    ? 'bg-emerald-400/90 text-black shadow-[0_10px_30px_rgba(16,185,129,0.4)]'
                    : 'border border-white/20 bg-transparent text-white/70 hover:border-white/40 hover:text-white'
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
                    ? 'bg-emerald-400/90 text-black shadow-[0_10px_30px_rgba(16,185,129,0.4)]'
                    : 'border border-white/20 bg-transparent text-white/70 hover:border-white/40 hover:text-white'
                )}
              >
                Console
              </button>
            </div>
          ) : null}
        </div>
        {showAutorunControls ? (
          <div className="flex items-center gap-3 text-xs text-white/60">
            {showRunButton ? (
              <button
                type="button"
                onClick={triggerRun}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Run
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Autorun</span>
              <button
                type="button"
                onClick={toggleAutorun}
                aria-pressed={autorunEnabled}
                aria-label="Toggle autorun"
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full border transition',
                  autorunEnabled
                    ? 'border-emerald-300/70 bg-emerald-400/30 shadow-[0_8px_20px_rgba(16,185,129,0.25)]'
                    : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                )}
              >
                <span
                  className={clsx(
                    'inline-flex h-5 w-5 translate-x-1 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-900 transition',
                    autorunEnabled && 'translate-x-[1.35rem] bg-emerald-300 text-emerald-950 shadow-[0_8px_16px_rgba(16,185,129,0.35)]'
                  )}
                >
                  {autorunEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="relative flex flex-1 min-h-0 bg-black/50 w-full">
        {effectiveMode === 'sandpack' ? (
          <SandpackProvider
            files={files}
            template={template}
            options={{
              externalResources: [],
              activeFile: activePath,
              autorun: autorunEnabled,
              autoReload: autorunEnabled,
              recompileMode: autorunEnabled ? 'delayed' : 'immediate',
              recompileDelay: autorunEnabled ? 300 : 0,
            }}
          >
            <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col w-full" style={{ height: '100%', minHeight: 0, width: '100%' }}>
              <SandpackManualRunner autorunEnabled={autorunEnabled} runRequestId={runRequestId} />
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
                  maxWidth: 'none',
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
          <RuntimePreview
            code={activeFileCode ?? ''}
            language={activeFileLanguage}
            autorunEnabled={autorunEnabled}
            runRequestId={runRequestId}
          />
        ) : effectiveMode === 'code' ? (
          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="relative flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 text-xs text-white/60">
              <span className="truncate">{activePath.replace(/^[\/]/, '')}</span>
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/70">
                Viewing
              </span>
            </div>
            <div className="relative flex-1 bg-black/50">
              <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-black/40 p-6 font-mono text-sm text-white/80">
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
