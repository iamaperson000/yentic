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
  runSignal?: number;
};

const runtimeLanguages = new Set<ExecutableLanguage>(['python', 'c', 'cpp', 'java']);

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
  const runId = useRef(0);
  const lastProcessedRun = useRef<number>(0);
  const lastExecutedSource = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const normalizedLanguage = runtimeLanguages.has(language as ExecutableLanguage)
    ? (language as ExecutableLanguage)
    : undefined;

  const enqueueExecution = useCallback(
    (trimmed: string): (() => void) | undefined => {
      if (!normalizedLanguage) return undefined;
      const nextId = runId.current + 1;
      runId.current = nextId;
      if (!trimmed) {
        lastExecutedSource.current = '';
        queueMicrotask(() => {
          setStatus('idle');
          setStdout('');
          setStderr('');
          setErrorMessage(null);
        });
        return undefined;
      }
      lastExecutedSource.current = trimmed;
      queueMicrotask(() => {
        setStatus('running');
        setErrorMessage(null);
      });
      const timeout = window.setTimeout(async () => {
        try {
          const result = await executeCode(normalizedLanguage, trimmed, '');
          if (runId.current !== nextId) return;
          setStdout(result.stdout);
          setStderr(result.stderr);
          setStatus(result.stderr ? 'error' : 'ready');
        } catch (error) {
          if (runId.current !== nextId) return;
          setStatus('error');
          setStdout('');
          setStderr('');
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      }, 150);
      return () => window.clearTimeout(timeout);
    },
    [normalizedLanguage]
  );

  useEffect(() => {
    if (!normalizedLanguage || autorunEnabled) {
      lastProcessedRun.current = runRequestId;
      return;
    }
    if (runRequestId === 0 || runRequestId === lastProcessedRun.current) return;
    lastProcessedRun.current = runRequestId;
    return enqueueExecution(code.trim());
  }, [autorunEnabled, code, enqueueExecution, normalizedLanguage, runRequestId]);

  useEffect(() => {
    if (!normalizedLanguage || !autorunEnabled) return;
    lastProcessedRun.current = runRequestId;
    const trimmed = code.trim();
    if (trimmed === lastExecutedSource.current) return;
    return enqueueExecution(trimmed);
  }, [autorunEnabled, code, enqueueExecution, normalizedLanguage, runRequestId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [stdout, stderr, status]);

  const isRunnable = Boolean(normalizedLanguage);
  const computedStatus: RuntimeStatus = !isRunnable ? 'error' : status;
  const displayStdout = isRunnable ? stdout : '';
  const displayStderr = isRunnable ? stderr : '';
  const hint = !isRunnable
    ? 'Select a runnable file to see output.'
    : computedStatus === 'running'
      ? 'Executing\u2026'
      : errorMessage || 'Press Run to execute your program.';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[var(--ide-bg-panel)]">
      <div
        ref={scrollRef}
        data-testid="runtime-output"
        className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-[var(--ide-text)]"
      >
        {displayStdout || displayStderr ? (
          <>
            {displayStdout ? <pre className="whitespace-pre-wrap break-words">{displayStdout}</pre> : null}
            {displayStderr ? (
              <pre className="mt-2 whitespace-pre-wrap break-words text-[#f2b8ae]">{displayStderr}</pre>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[var(--ide-text-faint)]">
            {hint}
          </div>
        )}
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
        <span className="text-[11px] font-medium tracking-[0.02em] text-[var(--ide-text-muted)]">Console</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-7 items-center border border-[var(--ide-border)] px-2.5 text-[10px] font-medium tracking-[0.02em] text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
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
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[var(--ide-bg-app)]/92 px-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-h-full w-full max-w-full overflow-auto">
            <div className="mx-auto flex max-w-full flex-col gap-3 border border-[var(--ide-danger)]/40 bg-[var(--ide-danger)]/10 px-5 py-4 text-left">
              <span className="text-[11px] font-medium tracking-[0.02em] text-[#f2b8ae]">
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
  runSignal,
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

  // External Run (from the topbar) — bump the run counter when the signal changes.
  const lastRunSignal = useRef(0);
  useEffect(() => {
    if (runSignal === undefined || runSignal === lastRunSignal.current) return;
    lastRunSignal.current = runSignal;
    if (runSignal > 0 && supportsAutorun) {
      schedulePreviewUpdate(() => setRunRequestId(previous => previous + 1));
    }
  }, [runSignal, supportsAutorun, schedulePreviewUpdate]);

  const toggleAutorun = useCallback(() => {
    setAutorunEnabled(prev => !prev);
  }, []);

  const showAutorunControls = supportsAutorun;
  const showRunButton = showAutorunControls && !autorunEnabled;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="ptabs">
        {effectiveMode === 'sandpack' ? (
          <>
            <button type="button" className={clsx('ptab', activeSandpackView === 'preview' && 'on')} onClick={() => setActiveSandpackView('preview')}>Preview</button>
            <button type="button" className={clsx('ptab', activeSandpackView === 'console' && 'on')} onClick={() => setActiveSandpackView('console')}>Console</button>
          </>
        ) : (
          <span className="ptab on">Output</span>
        )}
        <span className="grow" />
        <span className="k">{label}</span>
      </div>
      {showAutorunControls ? (
        <div className="purl">
          <button type="button" data-testid="preview-run-button" onClick={triggerRun} title="Run" style={{ color: 'var(--brand)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>▶ Run</button>
          <span className="bar">preview · runs in this tab</span>
          {onRefresh ? (
            <button type="button" data-testid="preview-refresh-button" onClick={onRefresh} title="Reload" aria-label="Refresh preview"><RotateCw style={{ width: 14, height: 14 }} /></button>
          ) : null}
          <button type="button" onClick={toggleAutorun} aria-pressed={autorunEnabled} title="Toggle autorun" style={{ color: autorunEnabled ? 'var(--fg)' : 'var(--muted)' }}>{autorunEnabled ? 'auto' : 'manual'}</button>
        </div>
      ) : null}
      <div className="pbody">
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
              <span className="border border-[var(--ide-border)] px-2 py-0.5 text-[10px] tracking-[0.02em] text-[var(--ide-text-faint)]">
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
      <div className="prunbar">
        <span className="d" />
        {autorunEnabled ? 'autorun on \u00b7 live' : 'runs in this tab'}
        <div className="r"><span>localhost preview</span></div>
      </div>
    </div>
  );
}