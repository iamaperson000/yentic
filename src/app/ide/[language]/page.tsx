'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

const extensionMap: Record<SupportedLanguage, string> = {
  html: 'html',
  css: 'css',
  javascript: 'js',
  python: 'py',
  c: 'c',
  java: 'java'
};

function smartPlaceholder(base: string, language?: SupportedLanguage) {
  if (!language) return base;
  const extension = extensionMap[language];
  if (!extension) return base;
  const dotIndex = base.lastIndexOf('.');
  const baseName = dotIndex === -1 ? base : base.slice(0, dotIndex);
  const normalized = baseName.trim() || 'untitled';
  return `${normalized}.${extension}`;
}

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
  const [recentlyCreatedPath, setRecentlyCreatedPath] = useState<string | null>(null);
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
        const nextLanguage = inferLanguage(nextPath);
        renamed = true;
        return { ...rest, [nextPath]: { ...oldFile, path: nextPath, language: nextLanguage } };
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

  const onCreate = useCallback((rawPath: string): string => {
      const desired = rawPath.trim() || config.newFilePlaceholder;
      let nextPath = desired;
      setFiles(prev => {
        const safePath = ensureUniquePath(desired, prev);
        nextPath = safePath;
        const fileLanguage = inferLanguage(safePath);
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
    }, [config.newFilePlaceholder]);

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
    ? 'inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100'
    : 'inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100';

  const actionButtonBaseClass =
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70';
  const primaryActionClass =
    `${actionButtonBaseClass} bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400`;
  const subtleActionClass =
    `${actionButtonBaseClass} border border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10 hover:text-white`;
  const dangerActionClass =
    `${actionButtonBaseClass} border border-rose-400/40 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20 hover:text-rose-50`;

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

  const createSmartFile = useCallback(() => {
    const activeFile = files[activePath];
    const activeLanguage = activeFile?.language;
    const placeholder = smartPlaceholder(config.newFilePlaceholder, activeLanguage);
    const createdPath = onCreate(placeholder);
    setRecentlyCreatedPath(createdPath);
    pushToast({ kind: 'success', message: `Created ${createdPath}` });
  }, [files, activePath, config.newFilePlaceholder, onCreate, pushToast]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!recentlyCreatedPath) return;
    const timeout = window.setTimeout(() => setRecentlyCreatedPath(null), 0);
    return () => window.clearTimeout(timeout);
  }, [recentlyCreatedPath]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#06070d] via-[#090b19] to-[#040509] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="relative flex min-h-screen flex-col">
        <header className="border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-black">
                  Y
                </span>
                <span className="hidden sm:inline">Back to home</span>
                <span className="sm:hidden">Home</span>
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{config.title} workspace</h1>
                <p className="mt-1 truncate text-sm text-white/60">{config.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-white/60">
              <span className={statusBadgeClass}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {savedLabel}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={createSmartFile} className={primaryActionClass}>
                  New file
                </button>
                <button onClick={handleSave} className={subtleActionClass}>
                  Save now
                </button>
                <button onClick={resetWorkspace} className={dangerActionClass}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col px-4 pb-8 pt-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1440px] flex-1 gap-4 md:gap-5 lg:grid-cols-[240px_minmax(0,1.8fr)_minmax(0,1.2fr)] xl:grid-cols-[260px_minmax(0,1.9fr)_minmax(0,1.2fr)]">
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40">
              <FileExplorer
                files={files}
                activePath={activePath}
                onSelect={setActivePath}
                onRename={onRename}
                onDelete={onDelete}
                onCreateFile={createSmartFile}
                newlyCreatedPath={recentlyCreatedPath}
                onFeedback={pushToast}
                placeholder={config.newFilePlaceholder}
              />
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40">
              <Editor value={code} language={lang} onChange={setActiveCode} />
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40">
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
        </main>

        {toast ? (
          <div className="pointer-events-none fixed inset-x-0 top-6 flex justify-center px-4">
            <div
              className={`pointer-events-auto inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur ${
                toast.kind === 'success'
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                  : 'border-rose-400/50 bg-rose-500/15 text-rose-100'
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] font-semibold uppercase tracking-[0.2em]">
                {toast.kind === 'success' ? 'OK' : 'ERR'}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
