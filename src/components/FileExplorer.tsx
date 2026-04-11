'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { File, FileCode, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';

import type { ProjectFileMap } from '@/lib/project';

function fileIcon(path: string) {
  if (/\.(js|ts|jsx|tsx)$/.test(path)) return <FileCode className="h-3.5 w-3.5 text-amber-300/80" />;
  if (path.endsWith('.py')) return <FileCode className="h-3.5 w-3.5 text-cyan-300/80" />;
  if (path.endsWith('.html')) return <FileCode className="h-3.5 w-3.5 text-orange-300/80" />;
  if (path.endsWith('.css')) return <FileCode className="h-3.5 w-3.5 text-sky-300/80" />;
  if (/\.(c|cpp|java)$/.test(path)) return <FileCode className="h-3.5 w-3.5 text-emerald-300/80" />;
  return <File className="h-3.5 w-3.5 text-[var(--ide-text-muted)]" />;
}

function splitPath(path: string) {
  const parts = path.split('/');
  const name = parts.pop() ?? path;
  const parent = parts.join('/');
  return { name, parent };
}

type FileExplorerProps = {
  files: ProjectFileMap;
  activePath: string;
  onSelect: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => string | null;
  onDelete: (path: string) => void;
  onCreateFile?: () => void;
  onResetWorkspace?: () => void;
  canReset?: boolean;
  newlyCreatedPath?: string | null;
  onFeedback?: (feedback: { kind: 'success' | 'error'; message: string }) => void;
  placeholder?: string;
  readOnly?: boolean;
};

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onResetWorkspace,
  canReset = false,
  newlyCreatedPath,
  onFeedback,
  placeholder,
  readOnly = false,
}: FileExplorerProps) {
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const entries = Object.values(files)
    .sort((a, b) => a.path.localeCompare(b.path))
    .filter(file => !searchQuery || file.path.toLowerCase().includes(searchQuery.toLowerCase()));

  const beginRename = useCallback(
    (path: string) => {
      if (readOnly) return;
      setRenameTarget(path);
      setRenameDraft(path);
    },
    [readOnly],
  );

  useEffect(() => {
    if (!newlyCreatedPath || typeof window === 'undefined' || readOnly) return;
    const frame = window.requestAnimationFrame(() => beginRename(newlyCreatedPath));
    return () => window.cancelAnimationFrame(frame);
  }, [beginRename, newlyCreatedPath, readOnly]);

  useEffect(() => {
    if (!renameTarget || typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
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
    [cancelRename, onFeedback, onRename, renameDraft],
  );

  return (
    <div className="flex h-full flex-col bg-[var(--ide-bg-panel)] text-[var(--ide-text)]">
      <div className="flex h-9 items-center border-b border-[var(--ide-border)] px-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ide-text-muted)]">
          Explorer
        </p>
        <div className="ml-auto flex items-center gap-1">
          {onCreateFile && !readOnly ? (
            <button
              type="button"
              onClick={onCreateFile}
              data-testid="create-file-button"
              className="inline-flex h-7 w-7 items-center justify-center border border-transparent text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
              aria-label="Create file"
              title="New file"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onResetWorkspace ? (
            <button
              type="button"
              onClick={onResetWorkspace}
              disabled={!canReset}
              data-testid="reset-workspace-button"
              className="inline-flex h-7 w-7 items-center justify-center border border-transparent text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Reset workspace"
              title="Reset workspace"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-[var(--ide-border)] px-3 py-2">
        <div className="flex items-center gap-2 border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-[var(--ide-text-faint)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Filter files"
            className="w-full bg-transparent text-[12px] text-[var(--ide-text)] placeholder:text-[var(--ide-text-faint)] outline-none"
          />
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto py-1">
        {entries.length ? (
          <ul>
            {entries.map(file => {
              const isActive = activePath === file.path;
              const isRenaming = renameTarget === file.path;
              const { name, parent } = splitPath(file.path);

              return (
                <li key={file.path}>
                  <div
                    className={clsx(
                      'group flex items-center gap-2 border-l-2 px-3 py-1.5',
                      isActive
                        ? 'border-[var(--ide-accent)] bg-[var(--ide-bg-active)]'
                        : 'border-transparent hover:bg-[var(--ide-bg-hover)]',
                    )}
                  >
                    {isRenaming ? (
                      <input
                        data-testid="file-rename-input"
                        ref={renameInputRef}
                        value={renameDraft}
                        onChange={event => setRenameDraft(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            submitRename(file.path);
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelRename();
                          }
                        }}
                        onBlur={() => submitRename(file.path)}
                        placeholder={placeholder ?? ''}
                        className="w-full border border-[var(--ide-accent)] bg-[var(--ide-bg-elevated)] px-2 py-1 text-[12px] text-[var(--ide-text)] outline-none"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelect(file.path)}
                          onDoubleClick={() => beginRename(file.path)}
                          data-testid={`file-entry-${file.path}`}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="shrink-0">{fileIcon(file.path)}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] text-[var(--ide-text)]">{name}</span>
                            {parent ? (
                              <span className="block truncate text-[11px] text-[var(--ide-text-faint)]">
                                {parent}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {readOnly ? null : (
                          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => beginRename(file.path)}
                              className="inline-flex h-6 w-6 items-center justify-center border border-transparent text-[var(--ide-text-faint)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-elevated)] hover:text-[var(--ide-text)]"
                              aria-label={`Rename ${file.path}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete ${file.path}?`)) {
                                  onDelete(file.path);
                                  onFeedback?.({ kind: 'success', message: `Deleted ${file.path}` });
                                  if (renameTarget === file.path) cancelRename();
                                }
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center border border-transparent text-[var(--ide-text-faint)] transition hover:border-[var(--ide-danger)]/40 hover:bg-[var(--ide-danger)]/10 hover:text-[#f2b8ae]"
                              aria-label={`Delete ${file.path}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-3 py-6 text-[12px] text-[var(--ide-text-faint)]">
            {searchQuery ? 'No matching files' : placeholder ?? 'No files yet'}
          </div>
        )}
      </div>
    </div>
  );
}
