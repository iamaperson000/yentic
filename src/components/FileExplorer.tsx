'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';

import type { ProjectFileMap } from '@/lib/project';

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
  onCollapse?: () => void;
  canReset?: boolean;
  newlyCreatedPath?: string | null;
  onFeedback?: (feedback: { kind: 'success' | 'error'; message: string }) => void;
  placeholder?: string;
  readOnly?: boolean;
};

const FILE_DOT: Record<string, string> = {
  html: '#e5896b', css: '#7aa2f7', js: '#e0af68', jsx: '#e0af68', mjs: '#e0af68',
  ts: '#79c0ff', tsx: '#79c0ff', py: '#8ee06f', json: '#9ece6a', c: '#e0af68',
  cpp: '#c9a2ff', h: '#8ee06f', java: '#c9a2ff', md: '#8a8478', svg: '#c9a2ff',
};
function dotColor(path: string) {
  return FILE_DOT[path.split('.').pop()?.toLowerCase() ?? ''] ?? '#8a8478';
}

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onResetWorkspace,
  onCollapse,
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
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="hd">
        <span className="t">Files<span className="chk">✓ saved</span></span>
        <span style={{ display: 'flex', gap: 2 }}>
          {onCollapse ? (
            <button type="button" className="k collapse" onClick={onCollapse} aria-label="Collapse panel" title="Collapse panel">
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path d="m14 6-6 6 6 6" /><path d="M18 6v12" /></svg>
            </button>
          ) : null}
          <button
            type="button"
            className="k"
            data-testid="reset-workspace-button"
            aria-label="Workspace actions"
            title={canReset ? 'Reset workspace to starter files' : 'Workspace actions'}
            onClick={() => {
              if (onResetWorkspace && canReset && window.confirm('Reset this workspace to the starter files? Your changes will be lost.')) onResetWorkspace();
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></svg>
          </button>
        </span>
      </div>

      <div className="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          type="text"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search files"
        />
      </div>

      <div className="tree">
        {entries.length ? (
          entries.map(file => {
            const isActive = activePath === file.path;
            const isRenaming = renameTarget === file.path;
            const { name } = splitPath(file.path);

            if (isRenaming) {
              return (
                <div key={file.path} className="row sel">
                  <span className="dot" style={{ background: dotColor(file.path) }} />
                  <input
                    data-testid="file-rename-input"
                    ref={renameInputRef}
                    value={renameDraft}
                    onChange={event => setRenameDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') { event.preventDefault(); submitRename(file.path); }
                      if (event.key === 'Escape') { event.preventDefault(); cancelRename(); }
                    }}
                    onBlur={() => submitRename(file.path)}
                    placeholder={placeholder ?? ''}
                    style={{ flex: 1, minWidth: 0, background: 'var(--panel2)', border: '1px solid var(--brand)', borderRadius: 4, color: 'var(--fg)', font: 'inherit', padding: '1px 6px', outline: 'none' }}
                  />
                </div>
              );
            }

            return (
              <button
                key={file.path}
                type="button"
                data-testid={`file-entry-${file.path}`}
                onClick={() => onSelect(file.path)}
                onDoubleClick={() => beginRename(file.path)}
                className={clsx('row', isActive && 'sel')}
              >
                <span className="dot" style={{ background: dotColor(file.path) }} />
                <span className="truncate" style={{ flex: 1, minWidth: 0 }}>{name}</span>
                {readOnly ? null : (
                  <span className="kebab" style={{ display: 'flex', gap: 4 }}>
                    <span role="button" tabIndex={-1} title="Rename" aria-label={`Rename ${file.path}`} onClick={event => { event.stopPropagation(); beginRename(file.path); }}>
                      <Pencil className="h-3 w-3" />
                    </span>
                    <span role="button" tabIndex={-1} title="Delete" aria-label={`Delete ${file.path}`} onClick={event => { event.stopPropagation(); if (window.confirm(`Delete ${file.path}?`)) { onDelete(file.path); onFeedback?.({ kind: 'success', message: `Deleted ${file.path}` }); if (renameTarget === file.path) cancelRename(); } }}>
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div style={{ padding: '18px 12px', color: 'var(--faint)', fontSize: 12 }}>
            {searchQuery ? 'No matching files' : placeholder ?? 'No files yet'}
          </div>
        )}
      </div>

      {readOnly ? null : (
        <div className="foot">
          <button type="button" onClick={onCreateFile} data-testid="create-file-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
            File
          </button>
          <button type="button" onClick={onCreateFile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            Folder
          </button>
        </div>
      )}
    </div>
  );
}
