'use client';
import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import type { ProjectFileMap, SupportedLanguage } from '@/lib/project';
import { inferLanguage } from '@/lib/project';

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onRename,
  onDelete,
  onCreate
}: {
  files: ProjectFileMap;
  activePath: string;
  onSelect: (p: string) => void;
  onRename: (oldP: string, newP: string) => void;
  onDelete: (p: string) => void;
  onCreate: (p: string, lang?: SupportedLanguage) => void;
}) {
  const [draft, setDraft] = useState<string>('');
  const entries = Object.values(files).sort((a, b) => a.path.localeCompare(b.path));

  const submitDraft = useCallback(() => {
    if (!draft.trim()) return;
    const language = inferLanguage(draft);
    onCreate(draft, language);
    setDraft('');
  }, [draft, onCreate]);

  return (
    <div className="flex h-full flex-col gap-5 p-5 text-sm text-white/80">
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">Workspace</h2>
        <p className="text-sm text-white/60">Manage your files and assets.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition focus-within:border-emerald-300/60">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitDraft();
              }
            }}
            placeholder="new-file.js"
            className="flex-1 appearance-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/90 px-3 py-1 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
            onClick={submitDraft}
          >
            Create
          </button>
        </div>
        <p className="mt-2 text-[11px] text-white/35">Press Enter to create instantly.</p>
      </div>
      <div className="custom-scrollbar -mr-2 flex-1 overflow-y-auto pr-1">
        <ul className="space-y-1.5">
          {entries.map(f => (
            <li
              key={f.path}
              className={clsx(
                'group relative rounded-xl border px-3 py-2 transition',
                activePath === f.path
                  ? 'border-emerald-300/70 bg-emerald-300/10 shadow-[0_15px_40px_rgba(16,185,129,0.28)]'
                  : 'border-transparent hover:border-white/15 hover:bg-white/5'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(f.path)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="truncate font-medium text-white/90">{f.path}</span>
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/30">{f.language}</span>
              </button>
              <div className="mt-2 flex items-center justify-end gap-2 text-[11px] opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-2 py-1 text-white/70 transition hover:border-white/40 hover:text-white"
                  onClick={() => {
                    const next = prompt('Rename to:', f.path);
                    if (next && next !== f.path) onRename(f.path, next);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-400/40 px-2 py-1 text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
                  onClick={() => onDelete(f.path)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
