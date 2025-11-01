'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  params: { language: string };
};

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const slug = params.language as WorkspaceSlug;
  const workspace = workspaceConfigs[slug];

  if (!workspace) {
    notFound();
  }

  const config = workspace;

  const [files, setFiles] = useState<ProjectFileMap>(() => getStarterProject(slug));
  const [activePath, setActivePath] = useState<string>(config.defaultActivePath);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  const onRename = useCallback((oldPath: string, newPathRaw: string) => {
    const nextPath = newPathRaw.trim();
    if (!nextPath || nextPath === oldPath) return;
    setFiles(prev => {
      if (!prev[oldPath]) {
        return prev;
      }
      if (prev[nextPath]) {
        window.alert('A file with that name already exists.');
        return prev;
      }
      const { [oldPath]: oldFile, ...rest } = prev;
      return { ...rest, [nextPath]: { ...oldFile, path: nextPath } };
    });
    if (activePath === oldPath) {
      setActivePath(nextPath);
    }
  }, [activePath]);

  const onDelete = useCallback((path: string) => {
    setFiles(prev => {
      if (!prev[path]) return prev;
      const nextFiles = { ...prev };
      delete nextFiles[path];
      const remaining = Object.keys(nextFiles);
      if (path === activePath) {
        if (remaining.length) {
          setActivePath(remaining.sort((a, b) => a.localeCompare(b))[0]);
        } else {
          const starter = getStarterProject(slug);
          setActivePath(config.defaultActivePath);
          return starter;
        }
      }
      return remaining.length ? nextFiles : getStarterProject(slug);
    });
  }, [activePath, slug, config.defaultActivePath]);

  const onCreate = useCallback((rawPath: string, language?: SupportedLanguage) => {
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
    ? 'inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100'
    : 'inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100';

  const toolbarButtonClass =
    'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70';

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
              <button onClick={() => onCreate(config.newFilePlaceholder)} className={toolbarButtonClass}>
                New file
              </button>
              <button onClick={handleSave} className={toolbarButtonClass}>
                Save now
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
                  onCreate={onCreate}
                  placeholder={config.newFilePlaceholder}
                />
              </div>
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#060a1c]/80 shadow-[0_30px_90px_rgba(17,25,56,0.5)]">
                <Editor value={code} language={lang} onChange={setActiveCode} />
              </div>
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#040811]/85 shadow-[0_30px_90px_rgba(11,22,55,0.5)]">
                <Preview
                  files={sandpackFiles}
                  activePath={`/${activePath}`}
                  template={config.previewTemplate}
                  disabledMessage={config.previewMessage}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
