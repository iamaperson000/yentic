'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  placeholder,
  readOnly = false
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
  readOnly?: boolean;
}) {
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const entries = Object.values(files).sort((a, b) => a.path.localeCompare(b.path));

  const beginRename = useCallback((path: string) => {
    if (readOnly) {
      return;
    }
    setRenameTarget(path);
    setRenameDraft(path);
  }, [readOnly]);

  useEffect(() => {
    if (!newlyCreatedPath || typeof window === 'undefined' || readOnly) return;
    const frame = window.requestAnimationFrame(() => {
      beginRename(newlyCreatedPath);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [newlyCreatedPath, beginRename, readOnly]);

  useEffect(() => {
    if (!renameTarget || typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [renameTarget]);

  const cancelRename = useCallback(() => {
    setRenameTarget(null);
    setRenameDraft('');
  }, []);

  const submitRename = useCallback(
    (path: string) => {
      const trimmed = renameDraft.trim();
      if (!trimmed) {
        setRenameDraft(path);
        onFeedback?.({ kind: 'error', message: 'File name cannot be empty.' });
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            renameInputRef.current?.focus();
            renameInputRef.current?.select();
          });
        }
        return;
      }
      if (trimmed === path) {
        cancelRename();
        return;
      }
      const error = onRename(path, trimmed);
      if (error) {
        onFeedback?.({ kind: 'error', message: error });
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            renameInputRef.current?.focus();
            renameInputRef.current?.select();
          });
        }
        return;
      }
      onFeedback?.({ kind: 'success', message: `Renamed to ${trimmed}` });
      cancelRename();
    },
    [renameDraft, onRename, onFeedback, cancelRename]
  );

  return (
    <div className="flex h-full flex-col text-xs text-white/80">
      <div className="flex items-center gap-2 border-b border-white/5 bg-black/20 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Files</p>
        {onCreateFile && !readOnly ? (
          <button
            type="button"
            onClick={onCreateFile}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-medium text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden className="text-base leading-none">＋</span>
            New
          </button>
        ) : null}
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2.5 py-2">
        <ul className="space-y-1">
          {entries.map(f => {
            const isActive = activePath === f.path;
            const isRenaming = renameTarget === f.path;
            return (
              <li
                key={f.path}
                className={clsx(
                  'rounded-lg px-2 py-1.5 transition',
                  isActive ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/40' : 'hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(f.path)}
                    onDoubleClick={() => beginRename(f.path)}
                    className={clsx(
                      'flex min-w-0 flex-1 items-center gap-2 text-left',
                      isRenaming ? 'pointer-events-none opacity-0' : 'opacity-100'
                    )}
                  >
                    <span className="truncate text-[13px] font-medium text-white">{f.path}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{f.language}</span>
                  </button>
                  {isRenaming || readOnly ? null : (
                    <div className="flex items-center gap-1 text-[11px] text-white/50">
                      <button
                        type="button"
                        onClick={() => beginRename(f.path)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 transition hover:border-white/30 hover:text-white"
                        aria-label={`Rename ${f.path}`}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${f.path}?`)) {
                            onDelete(f.path);
                            onFeedback?.({ kind: 'success', message: `Deleted ${f.path}` });
                            if (renameTarget === f.path) {
                              cancelRename();
                            }
                          }
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-400/30 text-rose-100/80 transition hover:border-rose-300 hover:text-rose-50"
                        aria-label={`Delete ${f.path}`}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
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
                    onBlur={() => submitRename(f.path)}
                    placeholder={placeholder ?? ''}
                    className="mt-1 w-full rounded-md border border-white/20 bg-black/70 px-2.5 py-1 text-sm text-white placeholder:text-white/35 focus:border-emerald-300/60 focus:outline-none focus:ring-1 focus:ring-emerald-300/40"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        {entries.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/35">
            {placeholder ?? 'No files yet'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
