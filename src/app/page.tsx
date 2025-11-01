'use client';
import { useEffect, useMemo, useState } from 'react';
import { Editor } from '@/components/Editor';
import { FileExplorer } from '@/components/FileExplorer';
import { Preview } from '@/components/Preview';
import { loadProject, saveProject, type ProjectFileMap, starterProject } from '@/lib/project';
import { clsx } from 'clsx';
export default function Home() {
  const [files, setFiles] = useState<ProjectFileMap>({});
  const [activePath, setActivePath] = useState<string>('index.html');
  useEffect(() => {
    const stored = loadProject();
    setFiles(stored || starterProject);
    setActivePath(stored && Object.keys(stored)[0] ? Object.keys(stored)[0] : 'index.html');
  }, []);
  const code = files[activePath]?.code ?? '';
  const lang = files[activePath]?.language ?? 'html';
  const setActiveCode = (next: string) => {
    setFiles(prev => ({
      ...prev,
      [activePath]: { ...prev[activePath], code: next }
    }));
  };
  const onRename = (oldPath: string, newPath: string) => {
    setFiles(prev => {
      if (!prev[oldPath]) return prev;
      const { [oldPath]: oldFile, ...rest } = prev;
      return { ...rest, [newPath]: { ...oldFile, path: newPath } };
    });
    if (activePath === oldPath) setActivePath(newPath);
  };
  const onDelete = (path: string) => {
    setFiles(prev => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
    if (activePath === path) setActivePath(Object.keys(files).filter(p => p !== path)[0] || 'index.html');
  };
  const onCreate = (path: string, language: 'html' | 'css' | 'javascript' = 'javascript') => {
    setFiles(prev => ({
      ...prev,
      [path]: { path, language, code: language === 'css' ? '/* new file */\n' : language === 'html' ? '<!-- new file -->\n' : '// new file\n' }
    }));
    setActivePath(path);
  };
  const handleSave = () => saveProject(files);
  const sandpackFiles = useMemo(() => {
    const map: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => {
      map[`/${f.path}`] = { code: f.code };
    });
    return map;
  }, [files]);
  return (
    <div className="grid grid-rows-[56px_1fr] h-screen">
      <header className="flex items-center justify-between px-4 border-b border-white/10 bg-panel">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <h1 className="text-lg font-medium tracking-tight">Yentic</h1>
          <span className="text-xs text-white/50">classic web IDE</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCreate('new.js', 'javascript')} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg">New</button>
          <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg">Save</button>
          <button onClick={() => navigator.clipboard.writeText(JSON.stringify(files))} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg">Share</button>
          <a href="https://github.com/new" target="_blank" className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg">Export</a>
        </div>
      </header>
      <main className="grid grid-cols-[260px_1fr_1fr] min-h-0">
        <aside className="border-r border-white/10 bg-panel overflow-y-auto">
          <FileExplorer files={files} activePath={activePath} onSelect={setActivePath} onRename={onRename} onDelete={onDelete} onCreate={onCreate}/>
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
