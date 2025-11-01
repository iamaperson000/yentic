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

  return (
    <div className="grid grid-rows-[56px_1fr] h-screen">
      <header className="flex items-center justify-between px-4 border-b border-white/10 bg-panel">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col leading-none">
            <h1 className="text-lg font-semibold tracking-tight">Yentic</h1>
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">lightweight web ide</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className={isSaving ? 'text-amber-300' : 'text-emerald-300'}>{savedLabel}</span>
          <div className="h-4 w-px bg-white/15" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreate('untitled.js')}
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg transition"
            >
              New file
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg transition"
            >
              Save now
            </button>
            <button
              onClick={handleShare}
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg transition"
            >
              {shareLabel}
            </button>
            <a
              href="https://github.com/new"
              target="_blank"
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg transition"
            >
              Export
            </a>
          </div>
        </div>
      </header>
      <main className="grid grid-cols-[260px_1fr_1fr] min-h-0">
        <aside className="border-r border-white/10 bg-panel overflow-y-auto">
          <FileExplorer
            files={files}
            activePath={activePath}
            onSelect={setActivePath}
            onRename={onRename}
            onDelete={onDelete}
            onCreate={onCreate}
          />
        </aside>
        <section className="min-w-0 overflow-hidden">
          <Editor value={code} language={lang} onChange={setActiveCode} />
        </section>
        <section className="border-l border-white/10 bg-panel min-w-0">
          <Preview files={sandpackFiles} activePath={`/${activePath}`} />
        </section>
      </main>
    </div>
  );
}
