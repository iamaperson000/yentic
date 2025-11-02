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
    <div className="flex h-full flex-col text-sm text-white/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Files</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onCreateFile ? (
            <button
              type="button"
              onClick={onCreateFile}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
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
                'rounded-2xl border px-3 py-2 transition',
                activePath === f.path
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40'
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(f.path)}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  <span className="truncate text-sm font-semibold text-white">{f.path}</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">{f.language}</span>
                </button>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/60 transition hover:border-white/40 hover:text-white"
                    onClick={() => beginRename(f.path)}
                    aria-label={`Rename ${f.path}`}
                  >
                    📝
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full border text-white/70 transition',
                      pendingDelete === f.path
                        ? 'border-rose-400/60 bg-rose-500/20 text-rose-100'
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
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/50 p-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
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
                      className="flex-1 rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submitRename(f.path)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {pendingDelete === f.path ? (
                <div className="mt-2 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-rose-100/80">Confirm deletion</p>
                  <p className="mt-1 text-xs text-rose-100/70">This action cannot be undone.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => confirmDelete(f.path)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/60 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
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
