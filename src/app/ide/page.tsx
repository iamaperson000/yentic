'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Editor } from '@/components/Editor';
import { FileExplorer } from '@/components/FileExplorer';
import { Preview } from '@/components/Preview';
import {
  ensureUniquePath,
  inferLanguage,
  loadProject,
  saveProject,
  scaffoldFor,
  type ProjectFileMap,
  type SupportedLanguage,
  starterProject
} from '@/lib/project';

function formatTime(date: Date | null) {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const [files, setFiles] = useState<ProjectFileMap>(starterProject);
  const [activePath, setActivePath] = useState<string>('index.html');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    const stored = loadProject();
    if (stored && Object.keys(stored).length) {
      setFiles(stored);
      const firstFile = Object.keys(stored).sort((a, b) => a.localeCompare(b))[0];
      setActivePath(firstFile);
    }
  }, []);

  useEffect(() => {
    if (!files || !Object.keys(files).length) return;
    setIsSaving(true);
    const timeout = window.setTimeout(() => {
      saveProject(files);
      setIsSaving(false);
      setLastSavedAt(new Date());
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [files]);

  const code = files[activePath]?.code ?? '';
  const lang = files[activePath]?.language ?? 'html';

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
          setActivePath('index.html');
        }
      }
      return remaining.length ? nextFiles : starterProject;
    });
  }, [activePath]);

  const onCreate = useCallback((rawPath: string, language?: SupportedLanguage) => {
    const desired = rawPath.trim() || 'untitled.js';
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
  }, []);

  const handleSave = useCallback(() => {
    saveProject(files);
    setLastSavedAt(new Date());
    setIsSaving(false);
  }, [files]);

  const handleShare = useCallback(async () => {
    try {
      const payload = btoa(encodeURIComponent(JSON.stringify(files)));
      await navigator.clipboard.writeText(payload);
      setShareFeedback('copied');
      window.setTimeout(() => setShareFeedback('idle'), 1600);
    } catch {
      setShareFeedback('error');
      window.setTimeout(() => setShareFeedback('idle'), 1600);
    }
  }, [files]);

  const sandpackFiles = useMemo(() => {
    const map: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => {
      map[`/${f.path}`] = { code: f.code };
    });
    return map;
  }, [files]);

  const formattedTime = formatTime(lastSavedAt);
  const savedLabel = isSaving ? 'Saving…' : formattedTime ? `Saved at ${formattedTime}` : 'Synced';
  const shareLabel = shareFeedback === 'copied' ? 'Copied!' : shareFeedback === 'error' ? 'Copy failed' : 'Share';
  const statusBadgeClass = isSaving
    ? 'inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100'
    : 'inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100';
  const toolbarButtonClass =
    'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70';
  const accentButtonClass =
    'inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/90 px-3 py-1.5 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(16,185,129,0.35)] transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200';
  const destructiveButtonClass =
    'inline-flex items-center gap-2 rounded-full border border-rose-400/60 bg-rose-500/80 px-3 py-1.5 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(244,63,94,0.35)] transition hover:bg-rose-400/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200';
  const shareButtonClass =
    shareFeedback === 'error'
      ? destructiveButtonClass
      : shareFeedback === 'copied'
        ? `${accentButtonClass} bg-emerald-300 text-slate-900`
        : accentButtonClass;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060f] via-[#050414] to-[#02030a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_58%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <div className="mb-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.35em] text-white/60">
              Yentic IDE
            </span>
            <div className="grid gap-2">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Code, preview, and share without leaving your browser.</h1>
              <p className="max-w-3xl text-base text-white/70 sm:text-lg">
                A lightning-fast workspace with a familiar layout, live Sandpack preview, and instant persistence. No noise—just you and your code.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-[0_40px_120px_rgba(14,23,60,0.35)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">Yentic Live Session</span>
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">lightweight web ide</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span className={statusBadgeClass}>{savedLabel}</span>
              <div className="hidden h-4 w-px bg-white/15 sm:block" />
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => onCreate('untitled.js')} className={toolbarButtonClass}>
                  New file
                </button>
                <button onClick={handleSave} className={toolbarButtonClass}>
                  Save now
                </button>
                <button onClick={handleShare} className={shareButtonClass}>
                  {shareLabel}
                </button>
                <a href="https://github.com/new" target="_blank" rel="noreferrer" className={toolbarButtonClass}>
                  Export
                </a>
              </div>
            </div>
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
              />
            </div>
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#060a1c]/80 shadow-[0_30px_90px_rgba(17,25,56,0.5)]">
              <Editor value={code} language={lang} onChange={setActiveCode} />
            </div>
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#040811]/85 shadow-[0_30px_90px_rgba(11,22,55,0.5)]">
              <Preview files={sandpackFiles} activePath={`/${activePath}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
