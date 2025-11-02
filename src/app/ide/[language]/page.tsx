'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Editor } from '@/components/Editor';
import { FileExplorer } from '@/components/FileExplorer';
import { Preview } from '@/components/Preview';
import {
  ensureUniquePath,
  getStarterProject,
  inferLanguage,
  loadProject,
  saveProject,
  scaffoldFor,
  type ProjectFileMap,
  type SupportedLanguage,
  type WorkspaceSlug,
  workspaceConfigs
} from '@/lib/project';

function formatTime(date: Date | null) {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type WorkspacePageProps = {
  params: Promise<{ language: string }>;
};

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { language } = use(params);
  const slug = language as WorkspaceSlug;
  const workspace = workspaceConfigs[slug];

  if (!workspace) {
    notFound();
  }

  const config = workspace;

  const [files, setFiles] = useState<ProjectFileMap>(() => getStarterProject(slug));
  const [activePath, setActivePath] = useState<string>(config.defaultActivePath);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileLanguage, setNewFileLanguage] = useState<SupportedLanguage | 'auto'>('auto');
  const [newFileError, setNewFileError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = loadProject(slug);
    if (stored && Object.keys(stored).length) {
      setFiles(stored);
      const preferred = stored[config.defaultActivePath]
        ? config.defaultActivePath
        : Object.keys(stored).sort((a, b) => a.localeCompare(b))[0];
      setActivePath(preferred);
    } else {
      const starter = getStarterProject(slug);
      setFiles(starter);
      setActivePath(config.defaultActivePath);
    }
  }, [slug, config.defaultActivePath]);

  useEffect(() => {
    if (!files || !Object.keys(files).length) return;
    setIsSaving(true);
    const timeout = window.setTimeout(() => {
      saveProject(slug, files);
      setIsSaving(false);
      setLastSavedAt(new Date());
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [files, slug]);

  const code = files[activePath]?.code ?? '';
  const lang = files[activePath]?.language ?? 'javascript';

  const setActiveCode = useCallback((next: string) => {
    setFiles(prev => {
      const target = prev[activePath];
      if (!target) return prev;
      return { ...prev, [activePath]: { ...target, code: next } };
    });
  }, [activePath]);

  const onRename = useCallback(
    (oldPath: string, newPathRaw: string): string | null => {
      const nextPath = newPathRaw.trim();
      if (!nextPath) {
        return 'File name cannot be empty.';
      }
      if (nextPath === oldPath) {
        return null;
      }

      let error: string | null = null;
      let renamed = false;

      setFiles(prev => {
        if (!prev[oldPath]) {
          error = 'The original file could not be found.';
          return prev;
        }
        if (prev[nextPath]) {
          error = 'A file with that name already exists.';
          return prev;
        }

        const { [oldPath]: oldFile, ...rest } = prev;
        renamed = true;
        return { ...rest, [nextPath]: { ...oldFile, path: nextPath } };
      });

      if (!error && renamed && activePath === oldPath) {
        setActivePath(nextPath);
      }

      return error;
    },
    [activePath]
  );

  const onDelete = useCallback((path: string) => {
    let nextActivePath = activePath;
    let shouldUpdateActive = false;

    setFiles(prev => {
      if (!prev[path]) return prev;
      const nextFiles = { ...prev };
      delete nextFiles[path];
      const remaining = Object.keys(nextFiles).sort((a, b) => a.localeCompare(b));

      if (!remaining.length) {
        nextActivePath = config.defaultActivePath;
        shouldUpdateActive = true;
        return getStarterProject(slug);
      }

      if (path === activePath) {
        nextActivePath = remaining[0];
        shouldUpdateActive = true;
      }

      return nextFiles;
    });

    if (shouldUpdateActive) {
      setActivePath(nextActivePath);
    }
  }, [activePath, slug, config.defaultActivePath]);

  const onCreate = useCallback(
    (rawPath: string, language?: SupportedLanguage): string => {
      const desired = rawPath.trim() || config.newFilePlaceholder;
      let nextPath = desired;
      setFiles(prev => {
        const safePath = ensureUniquePath(desired, prev);
        nextPath = safePath;
        const fileLanguage = language ?? inferLanguage(safePath);
        return {
          ...prev,
          [safePath]: {
            path: safePath,
            language: fileLanguage,
            code: scaffoldFor(safePath, fileLanguage)
          }
        };
      });
      setActivePath(nextPath);
      return nextPath;
    },
    [config.newFilePlaceholder]
  );

  const handleSave = useCallback(() => {
    saveProject(slug, files);
    setLastSavedAt(new Date());
    setIsSaving(false);
  }, [files, slug]);

  const sandpackFiles = useMemo(() => {
    const map: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => {
      map[`/${f.path}`] = { code: f.code };
    });
    return map;
  }, [files]);

  const formattedTime = formatTime(lastSavedAt);
  const savedLabel = isSaving ? 'Saving…' : formattedTime ? `Saved at ${formattedTime}` : 'Synced';

  const statusBadgeClass = isSaving
    ? 'inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100'
    : 'inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100';

  const toolbarButtonBaseClass =
    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70';
  const toolbarButtonClass =
    `${toolbarButtonBaseClass} border border-white/15 bg-white/10 text-white/90 hover:border-white/25 hover:bg-white/15`;
  const resetButtonClass =
    `${toolbarButtonBaseClass} border border-rose-400/40 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/20`;

  const resetWorkspace = useCallback(() => {
    const confirmed = window.confirm(
      'Reset this workspace to the starter files? This will replace your current files.'
    );
    if (!confirmed) {
      return;
    }
    const starter = getStarterProject(slug);
    setFiles(starter);
    setActivePath(config.defaultActivePath);
    saveProject(slug, starter);
    setLastSavedAt(new Date());
    setIsSaving(false);
  }, [slug, config.defaultActivePath]);

  const pushToast = useCallback((next: { kind: 'success' | 'error'; message: string }) => {
    setToast(next);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const closeCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
    setNewFileName('');
    setNewFileLanguage('auto');
    setNewFileError(null);
  }, []);

  const submitCreateDialog = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = newFileName.trim();
      if (!trimmed) {
        setNewFileError('Please provide a file name.');
        return;
      }
      const language = newFileLanguage === 'auto' ? undefined : newFileLanguage;
      const createdPath = onCreate(trimmed, language);
      pushToast({ kind: 'success', message: `Created ${createdPath}` });
      closeCreateDialog();
    },
    [newFileName, newFileLanguage, onCreate, pushToast, closeCreateDialog]
  );

  const languageOptions: Array<{ value: SupportedLanguage | 'auto'; label: string }> = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'c', label: 'C' },
    { value: 'java', label: 'Java' }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060f] via-[#050414] to-[#02030a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_58%)]" />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-8 py-5 backdrop-blur">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-base font-semibold text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.45)]">
              Y
            </span>
            Back to home
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className={statusBadgeClass}>{savedLabel}</span>
            <div className="hidden h-4 w-px bg-white/15 sm:block" />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setIsCreateDialogOpen(true)} className={toolbarButtonClass}>
                New file
              </button>
              <button onClick={handleSave} className={toolbarButtonClass}>
                Save now
              </button>
              <button onClick={resetWorkspace} className={resetButtonClass}>
                Reset workspace
              </button>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 px-8 py-8">
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_rgba(10,18,41,0.45)] backdrop-blur-xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.35em] text-white/60">
              {config.title}
            </div>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{config.title} workspace</h1>
              <p className="max-w-3xl text-sm text-white/70 sm:text-base">{config.description}</p>
            </div>
          </div>
          <div className="relative flex flex-1 flex-col">
            <div className="grid min-h-[600px] flex-1 gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_rgba(10,18,41,0.45)] backdrop-blur-2xl lg:grid-cols-[300px_minmax(0,1.05fr)_minmax(0,1fr)]">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_24px_70px_rgba(5,10,25,0.45)]">
                <FileExplorer
                  files={files}
                  activePath={activePath}
                  onSelect={setActivePath}
                  onRename={onRename}
                  onDelete={onDelete}
                  onOpenCreateDialog={() => setIsCreateDialogOpen(true)}
                  onFeedback={pushToast}
                  placeholder={config.newFilePlaceholder}
                />
              </div>
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#060a1c]/80 shadow-[0_30px_90px_rgba(17,25,56,0.5)]">
                <Editor value={code} language={lang} onChange={setActiveCode} />
              </div>
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#040811]/85 shadow-[0_30px_90px_rgba(11,22,55,0.5)]">
                <Preview
                  files={sandpackFiles}
                  activePath={`/${activePath}`}
                  template={config.previewTemplate}
                  mode={config.previewMode}
                  disabledMessage={config.previewMessage}
                  activeFileCode={code}
                  activeFileLanguage={lang}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 flex justify-center px-4">
          <div
            className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur ${
              toast.kind === 'success'
                ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-100'
                : 'border-rose-400/40 bg-rose-400/20 text-rose-100'
            }`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-xs font-semibold uppercase tracking-[0.2em]">
              {toast.kind === 'success' ? 'OK' : 'ERR'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}

      {isCreateDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#070b18] p-8 text-white shadow-[0_40px_120px_rgba(8,15,40,0.65)]">
            <button
              type="button"
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition hover:border-white/25 hover:text-white"
              onClick={closeCreateDialog}
            >
              <span className="sr-only">Close create file dialog</span>
              ×
            </button>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
                New file
              </span>
              <h2 className="text-2xl font-semibold">Create a fresh file</h2>
              <p className="text-sm text-white/60">Name your file and optionally choose a language. We&apos;ll scaffold it for you instantly.</p>
            </div>
            <form onSubmit={submitCreateDialog} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">File name</label>
                <input
                  autoFocus
                  value={newFileName}
                  onChange={event => {
                    setNewFileName(event.target.value);
                    if (newFileError) {
                      setNewFileError(null);
                    }
                  }}
                  placeholder={config.newFilePlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-300/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Language</label>
                <div className="relative">
                  <select
                    value={newFileLanguage}
                    onChange={event => setNewFileLanguage(event.target.value as SupportedLanguage | 'auto')}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-emerald-300/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  >
                    {languageOptions.map(option => (
                      <option key={option.value} value={option.value} className="bg-[#070b18] text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/40">▾</span>
                </div>
                <p className="text-[11px] text-white/35">Auto-detect chooses a language based on the file extension.</p>
              </div>
              {newFileError ? (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {newFileError}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_15px_45px_rgba(16,185,129,0.35)] transition hover:bg-emerald-300"
                >
                  Create file
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
