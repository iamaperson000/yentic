'use client';
import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import type { ProjectFileMap } from '@/lib/project';

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onRename,
  onDelete,
  onOpenCreateDialog,
  onFeedback,
  placeholder
}: {
  files: ProjectFileMap;
  activePath: string;
  onSelect: (p: string) => void;
  onRename: (oldP: string, newP: string) => string | null;
  onDelete: (p: string) => void;
  onOpenCreateDialog?: () => void;
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
    <div className="flex h-full flex-col gap-6 p-6 text-sm text-white/80">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">Workspace</h2>
          <p className="text-sm text-white/60">
            Manage files, rename paths, and keep your project tidy.
          </p>
        </div>
        {onOpenCreateDialog ? (
          <button
            type="button"
            onClick={onOpenCreateDialog}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_15px_45px_rgba(16,185,129,0.35)] transition hover:bg-emerald-300"
          >
            <span className="text-base">＋</span>
            New file
          </button>
        ) : null}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-white/35">Tip</p>
          <p className="text-sm text-white/55">
            Use descriptive names like <span className="text-white/75">{placeholder ?? 'app.js'}</span> to keep things organized.
          </p>
        </div>
      </div>
      <div className="custom-scrollbar -mr-2 flex-1 overflow-y-auto pr-1">
        <ul className="space-y-2">
          {entries.map(f => (
            <li
              key={f.path}
              className={clsx(
                'group relative overflow-hidden rounded-2xl border px-4 py-3 transition',
                activePath === f.path
                  ? 'border-emerald-300/70 bg-emerald-300/10 shadow-[0_15px_45px_rgba(16,185,129,0.28)]'
                  : 'border-white/5 bg-white/0 hover:border-white/15 hover:bg-white/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(f.path)}
                  className="flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium text-white/90">{f.path}</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-white/30">{f.language}</span>
                </button>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-white/30 hover:text-white"
                    onClick={() => beginRename(f.path)}
                    aria-label={`Rename ${f.path}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full border text-white/70 transition',
                      pendingDelete === f.path
                        ? 'border-rose-400/70 bg-rose-500/20 text-rose-100'
                        : 'border-rose-400/40 bg-rose-500/10 hover:border-rose-300 hover:text-rose-100'
                    )}
                    onClick={() =>
                      setPendingDelete(current => (current === f.path ? null : f.path))
                    }
                    aria-label={`Delete ${f.path}`}
                  >
                    ⌫
                  </button>
                </div>
              </div>

              {renameTarget === f.path ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/35">
                    Rename file
                  </label>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                      className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-300/70 focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submitRename(f.path)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/90 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {pendingDelete === f.path ? (
                <div className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <p className="text-xs uppercase tracking-[0.25em] text-rose-100/70">Confirm deletion</p>
                  <p className="mt-1 text-sm text-rose-100/80">This action cannot be undone.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => confirmDelete(f.path)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-300/60 bg-rose-400/20 px-4 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/30"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
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
