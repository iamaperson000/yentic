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
import { RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  onRefresh?: () => void;
};

const runtimeLanguages = new Set<ExecutableLanguage>(['python', 'c', 'cpp', 'java']);

const consoleInputLanguages = new Set<ExecutableLanguage>();

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
      ? 'border border-amber-300/40 bg-amber-500/10 text-amber-100'
      : computedStatus === 'error'
        ? 'border border-[var(--ide-danger)]/50 bg-[var(--ide-danger)]/10 text-[#f2b8ae]'
        : 'border border-[#2d7d46] bg-[#1f4d2e] text-[#d4f7dc]';

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
      <div className="flex items-center justify-between border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">{runtimeLabel}</span>
        <span className={clsx('inline-flex items-center gap-2 border px-2 py-1 text-[10px] uppercase tracking-[0.12em]', badgeClass)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {statusLabel}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col bg-[var(--ide-bg-panel)]">
        <div className="relative flex flex-1 flex-col gap-3 overflow-hidden p-3 text-sm text-[var(--ide-text)]">
          {!autorunEnabled && hasPendingChanges ? (
            <div className="border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Code changed since your last run. Press Run to update the output.
            </div>
          ) : null}
          {computedErrorMessage ? (
            <div className="border border-[var(--ide-danger)]/40 bg-[var(--ide-danger)]/10 px-3 py-2 text-[#f2b8ae]">
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
            <div className="flex flex-col overflow-hidden border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
              <div className="border-b border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">
                Standard Input
              </div>
              <textarea
                value={textInputValue}
                onChange={event =>
                  normalizedLanguage
                    ? setTextInputs(previous => ({ ...previous, [normalizedLanguage]: event.target.value }))
                    : void 0
                }
                className="min-h-[80px] flex-1 bg-transparent px-3 py-3 font-mono text-[13px] leading-relaxed text-[var(--ide-text)] outline-none placeholder:text-[var(--ide-text-faint)]"
                placeholder="Provide input for stdin reads…"
              />
              <div className="border-t border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ide-text-faint)]">
                Passed to program via stdin before execution
              </div>
            </div>
          ) : null}
          <div className="flex flex-1 flex-col overflow-hidden border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
            <div className="border-b border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">
              Output
            </div>
            <div
              ref={scrollRef}
              data-testid="runtime-output"
              className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-[var(--ide-text)]"
            >
              {displayStdout ? (
                <pre className="whitespace-pre-wrap break-words">{displayStdout}</pre>
              ) : (
                <span className="text-[var(--ide-text-faint)]">{computedStatus === 'running' ? 'Executing…' : 'No output yet.'}</span>
              )}
            </div>
          </div>
          {displayStderr ? (
            <div className="flex flex-col overflow-hidden border border-[var(--ide-danger)]/40 bg-[var(--ide-danger)]/10">
              <div className="border-b border-[var(--ide-danger)]/40 bg-transparent px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#f2b8ae]">
                Errors
              </div>
              <div className="max-h-48 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-[#f2b8ae]">
                <pre className="whitespace-pre-wrap break-words">{displayStderr}</pre>
              </div>
            </div>
          ) : null}
          {computedStatus === 'idle' && !displayStderr && !displayStdout ? (
            <div className="border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2 text-sm text-[var(--ide-text-muted)]">
              {idleHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ConsoleEntryType = 'log' | 'warn' | 'error' | 'info';

type ConsoleEntry = {
  id: string;
  type: ConsoleEntryType;
  text: string;
};

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

  const handleClear = () => {
    reset();
    processedIdsRef.current.clear();
    setEntries([]);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[var(--ide-bg-panel)] text-[var(--ide-text)]">
      <div className="flex items-center justify-between border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">Console</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-7 items-center border border-[var(--ide-border)] px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        {entries.length === 0 ? (
          <span className="text-[var(--ide-text-faint)]">Console output from the preview will appear here.</span>
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
                      : 'text-white/80';
              return (
                <li key={entry.id} className={clsx('whitespace-pre-wrap break-words', baseClass)}>
                  {entry.text}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-4 py-3 text-xs text-[var(--ide-text-faint)]">
        Interactive evaluation is disabled here. Open your browser devtools if you need to inspect the preview manually.
      </div>
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
            <div className="mx-auto flex max-w-full flex-col gap-3 border border-[var(--ide-danger)]/40 bg-[var(--ide-danger)]/10 px-5 py-4 text-left">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#f2b8ae]">
                Preview Error
              </span>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[#f2b8ae]">
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
  activeFileLanguage,
  onRefresh,
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
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">{label}</span>
          {effectiveMode === 'sandpack' ? (
            <div className="flex items-center gap-px border border-[var(--ide-border)] bg-[var(--ide-bg-panel)] text-[var(--ide-text-muted)]">
              <button
                type="button"
                onClick={() => setActiveSandpackView('preview')}
                className={clsx(
                  'px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition',
                  activeSandpackView === 'preview'
                    ? 'bg-[var(--ide-bg-active)] text-[var(--ide-text)]'
                    : 'text-[var(--ide-text-muted)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]'
                )}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveSandpackView('console')}
                className={clsx(
                  'px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition',
                  activeSandpackView === 'console'
                    ? 'bg-[var(--ide-bg-active)] text-[var(--ide-text)]'
                    : 'text-[var(--ide-text-muted)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]'
                )}
              >
                Console
              </button>
            </div>
          ) : null}
        </div>
        {showAutorunControls ? (
          <div className="flex items-center gap-2 text-xs text-[var(--ide-text-muted)]">
            {showRunButton ? (
              <button
                type="button"
                onClick={triggerRun}
                data-testid="preview-run-button"
                className="inline-flex h-7 items-center border border-[#2d7d46] bg-[#1f4d2e] px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#d4f7dc] transition hover:border-[#399c58] hover:bg-[#256338]"
              >
                Run
              </button>
            ) : null}
            <div className="flex items-center gap-1">
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  data-testid="preview-refresh-button"
                  className="inline-flex h-7 w-7 items-center justify-center border border-[var(--ide-border)] text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
                  aria-label="Refresh preview"
                  title="Refresh preview"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleAutorun}
                aria-pressed={autorunEnabled}
                aria-label="Toggle autorun"
                className={clsx(
                  'inline-flex h-7 items-center border px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] transition',
                  autorunEnabled
                    ? 'border-[var(--ide-border-strong)] bg-[var(--ide-bg-active)] text-[var(--ide-text)]'
                    : 'border-[var(--ide-border)] bg-[var(--ide-bg-panel)] text-[var(--ide-text-muted)] hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]'
                )}
              >
                Autorun {autorunEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="relative flex w-full min-h-0 flex-1 bg-[var(--ide-bg-panel)]">
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
            <div className="relative flex items-center justify-between border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2 text-[11px] text-[var(--ide-text-muted)]">
              <span className="truncate">{activePath.replace(/^[\/]/, '')}</span>
              <span className="border border-[var(--ide-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ide-text-faint)]">
                Viewing
              </span>
            </div>
            <div className="relative flex-1 bg-[var(--ide-bg-panel)]">
              <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-[var(--ide-bg-editor)] p-4 font-mono text-[13px] text-[var(--ide-text)]">
                <code>{activeFileCode ?? ''}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[var(--ide-text-muted)]">
            {disabledMessage ?? 'Preview is not available for this workspace yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
