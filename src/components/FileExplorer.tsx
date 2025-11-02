'use client';
import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { ProjectFileMap } from '@/lib/project';

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  newlyCreatedPath,
  onFeedback,
  placeholder
}: {
  files: ProjectFileMap;
  activePath: string;
  onSelect: (p: string) => void;
  onRename: (oldP: string, newP: string) => string | null;
  onDelete: (p: string) => void;
  onCreateFile?: () => void;
  newlyCreatedPath?: string | null;
  onFeedback?: (feedback: { kind: 'success' | 'error'; message: string }) => void;
  placeholder?: string;
}) {
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const entries = Object.values(files).sort((a, b) => a.path.localeCompare(b.path));

  const beginRename = useCallback((path: string) => {
    setPendingDelete(null);
    setRenameTarget(path);
    setRenameDraft(path);
  }, []);

  useEffect(() => {
    if (!newlyCreatedPath) return;
    const frame = window.requestAnimationFrame(() => {
      beginRename(newlyCreatedPath);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [newlyCreatedPath, beginRename]);

  const cancelRename = useCallback(() => {
    setRenameTarget(null);
    setRenameDraft('');
  }, []);

  const submitRename = useCallback(
    (path: string) => {
      const trimmed = renameDraft.trim();
      if (!trimmed || trimmed === path) {
        cancelRename();
        return;
      }
      const error = onRename(path, trimmed);
      if (error) {
        onFeedback?.({ kind: 'error', message: error });
        return;
      }
      onFeedback?.({ kind: 'success', message: `Renamed to ${trimmed}` });
      cancelRename();
    },
    [renameDraft, onRename, onFeedback, cancelRename]
  );

  const confirmDelete = useCallback(
    (path: string) => {
      onDelete(path);
      setPendingDelete(null);
      onFeedback?.({ kind: 'success', message: `Deleted ${path}` });
      if (renameTarget === path) {
        cancelRename();
      }
    },
    [onDelete, onFeedback, renameTarget, cancelRename]
  );

  return (
    <div className="flex h-full flex-col text-sm text-slate-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/80 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Files</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onCreateFile ? (
            <button
              type="button"
              onClick={onCreateFile}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/70 hover:bg-emerald-500/20"
            >
              <span aria-hidden className="text-base leading-none">＋</span>
              New file
            </button>
          ) : null}
        </div>
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-1.5">
          {entries.map(f => (
            <li
              key={f.path}
              className={clsx(
                'rounded-lg border px-3 py-2 transition',
                activePath === f.path
                  ? 'border-emerald-400/50 bg-emerald-500/10'
                  : 'border-slate-900/70 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/70'
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(f.path)}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  <span className="truncate text-sm font-medium text-slate-100">{f.path}</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{f.language}</span>
                </button>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
                    onClick={() => beginRename(f.path)}
                    aria-label={`Rename ${f.path}`}
                  >
                    📝
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex h-7 w-7 items-center justify-center rounded-md border text-slate-300 transition',
                      pendingDelete === f.path
                        ? 'border-rose-400/70 bg-rose-500/20 text-rose-100'
                        : 'border-rose-400/40 bg-rose-500/10 hover:border-rose-300 hover:text-rose-100'
                    )}
                    onClick={() =>
                      setPendingDelete(current => (current === f.path ? null : f.path))
                    }
                    aria-label={`Delete ${f.path}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {renameTarget === f.path ? (
                <div className="mt-2 rounded-md border border-slate-800 bg-slate-900/80 p-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Rename file
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={renameDraft}
                      onChange={event => setRenameDraft(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          submitRename(f.path);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      placeholder={placeholder ?? ''}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submitRename(f.path)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/70 bg-emerald-400/80 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {pendingDelete === f.path ? (
                <div className="mt-2 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-rose-100/70">Confirm deletion</p>
                  <p className="mt-1 text-xs text-rose-100/80">This action cannot be undone.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => confirmDelete(f.path)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-rose-300/60 bg-rose-400/20 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/30"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-600 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
