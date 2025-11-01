'use client';
import { useState } from 'react';
import { clsx } from 'clsx';
import type { ProjectFileMap } from '@/lib/project';
export function FileExplorer({ files, activePath, onSelect, onRename, onDelete, onCreate }: {
  files: ProjectFileMap; activePath: string; onSelect: (p: string) => void; onRename: (oldP: string, newP: string) => void; onDelete: (p: string) => void; onCreate: (p: string, lang?: 'html'|'css'|'javascript') => void;
}) {
  const [draft, setDraft] = useState<string>('');
  const entries = Object.values(files).sort((a,b) => a.path.localeCompare(b.path));
  return (
    <div className="p-3 text-sm">
      <div className="flex items-center gap-2 mb-3">
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="new-file.js"
          className="w-full bg-black/20 rounded px-2 py-1 outline-none border border-white/10 focus:border-white/20"/>
        <button className="px-2 py-1 bg-white/10 rounded" onClick={() => {
          if (!draft.trim()) return;
          const ext = draft.split('.').pop() || 'js';
          const lang = ext === 'html' ? 'html' : ext === 'css' ? 'css' : 'javascript';
          onCreate(draft, lang);
          setDraft('');
        }}>Add</button>
      </div>
      <ul className="space-y-1">
        {entries.map(f => (
          <li key={f.path} className={clsx('group flex items-center justify-between rounded px-2 py-1 cursor-pointer', activePath === f.path ? 'bg-white/10' : 'hover:bg-white/5')}>
            <span onClick={() => onSelect(f.path)} className="truncate">{f.path}</span>
            <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
              <button className="text-xs px-1 py-0.5 bg-white/10 rounded" onClick={() => {
                const next = prompt('Rename to:', f.path);
                if (next && next !== f.path) onRename(f.path, next);
              }}>Rename</button>
              <button className="text-xs px-1 py-0.5 bg-white/10 rounded" onClick={() => onDelete(f.path)}>Del</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
