'use client';

import { useMemo } from 'react';

import { type CollaboratorInfo, type ViewerRole } from '@/types/collaboration';

type ProjectShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  owner: CollaboratorInfo | null;
  collaborators: CollaboratorInfo[];
  viewerRole: ViewerRole;
  inviteValue: string;
  onInviteValueChange: (value: string) => void;
  onInviteSubmit: () => void;
  inviteError: string | null;
  isInviteSubmitting: boolean;
  isLoading: boolean;
  canInvite: boolean;
  onRemoveCollaborator: (userId: string) => void;
  removeError: string | null;
  shareUrl: string | null;
  isShareUrlLoading: boolean;
  shareUrlError: string | null;
  canManageShareLink: boolean;
  onCopyShareUrl: () => void;
  onResetShareUrl: () => void;
};

function roleLabel(role: ViewerRole) {
  if (role === 'owner') return 'Owner';
  if (role === 'editor') return 'Editor';
  return 'Viewer';
}

export function ProjectShareModal({
  isOpen,
  onClose,
  owner,
  collaborators,
  viewerRole,
  inviteValue,
  onInviteValueChange,
  onInviteSubmit,
  inviteError,
  isInviteSubmitting,
  isLoading,
  canInvite,
  onRemoveCollaborator,
  removeError,
  shareUrl,
  isShareUrlLoading,
  shareUrlError,
  canManageShareLink,
  onCopyShareUrl,
  onResetShareUrl,
}: ProjectShareModalProps) {
  const members = useMemo(() => {
    const list: CollaboratorInfo[] = [];
    if (owner) {
      list.push(owner);
    }
    return list.concat(collaborators);
  }, [owner, collaborators]);

  const fullShareUrl = useMemo(() => {
    if (!shareUrl) {
      return '';
    }
    if (typeof window === 'undefined') {
      return shareUrl;
    }
    try {
      return new URL(shareUrl, window.location.origin).toString();
    } catch {
      return shareUrl;
    }
  }, [shareUrl]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] p-5 text-[var(--ide-text)] shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Share project</h2>
            <p className="text-sm text-[var(--ide-text-muted)]">Invite teammates to edit this project in real time.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--ide-border)] p-1.5 text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)]"
            aria-label="Close share dialog"
          >
            <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
              <path
                d="M6 6l8 8m0-8-8 8"
                className="fill-none stroke-current stroke-[1.4]"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="border border-[var(--ide-border)] bg-[var(--ide-bg-panel)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ide-text)]">Shareable link</p>
                <p className="text-xs text-[var(--ide-text-muted)]">
                  {canManageShareLink
                    ? 'Anyone with this link joins as a viewer.'
                    : 'Only project owners can generate and manage share links.'}
                </p>
              </div>
              {canManageShareLink ? (
                <button
                  type="button"
                  onClick={onResetShareUrl}
                  disabled={isShareUrlLoading}
                  className="border border-[var(--ide-border)] px-3 py-1 text-[11px] font-medium text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Refresh link
                </button>
              ) : null}
            </div>
            {isShareUrlLoading ? (
              <p className="mt-3 text-sm text-[var(--ide-text-muted)]">Generating link…</p>
            ) : canManageShareLink ? (
              shareUrl ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={fullShareUrl}
                    readOnly
                    className="flex-1 border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2 text-sm text-[var(--ide-text)] outline-none focus:border-[var(--ide-accent)]"
                  />
                  <button
                    type="button"
                    onClick={onCopyShareUrl}
                    disabled={!shareUrl || isShareUrlLoading}
                    className="border border-[var(--ide-border-strong)] bg-[var(--ide-bg-active)] px-4 py-2 text-sm font-medium text-[var(--ide-text)] transition hover:border-[var(--ide-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Copy link
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--ide-text-muted)]">Click refresh to generate a share link.</p>
              )
            ) : (
              <p className="mt-3 text-sm text-[var(--ide-text-muted)]">Ask the project owner to share the link with you.</p>
            )}
            {shareUrlError ? <p className="mt-2 text-sm text-[#f2b8ae]">{shareUrlError}</p> : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ide-text-faint)]">Your role</p>
            <p className="text-sm font-medium text-[var(--ide-text)]">{roleLabel(viewerRole)}</p>
          </div>

          <div className="border border-[var(--ide-border)] bg-[var(--ide-bg-panel)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ide-text)]">Invite collaborators</p>
                <p className="text-xs text-[var(--ide-text-muted)]">Use a username or email.</p>
              </div>
              <span className="border border-[var(--ide-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ide-text-faint)]">
                Owners only
              </span>
            </div>
            <form
              className="mt-3 flex flex-col gap-3 sm:flex-row"
              onSubmit={event => {
                event.preventDefault();
                if (!canInvite) return;
                onInviteSubmit();
              }}
            >
              <input
                value={inviteValue}
                onChange={event => onInviteValueChange(event.target.value)}
                placeholder="Search username or email"
                disabled={!canInvite || isInviteSubmitting}
                className="flex-1 border border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] px-3 py-2 text-sm text-[var(--ide-text)] placeholder:text-[var(--ide-text-faint)] outline-none focus:border-[var(--ide-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!canInvite || isInviteSubmitting}
                className={`border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ide-accent)] ${
                  canInvite && !isInviteSubmitting
                    ? 'border-[var(--ide-border-strong)] bg-[var(--ide-bg-active)] text-[var(--ide-text)] hover:border-[var(--ide-accent)] hover:text-white'
                    : 'cursor-not-allowed border-[var(--ide-border)] bg-[var(--ide-bg-elevated)] text-[var(--ide-text-faint)]'
                }`}
              >
                {isInviteSubmitting ? 'Inviting…' : 'Invite'}
              </button>
            </form>
            {inviteError ? <p className="mt-2 text-sm text-[#f2b8ae]">{inviteError}</p> : null}
            {!canInvite ? (
              <p className="mt-2 text-xs text-[var(--ide-text-faint)]">Only project owners can invite collaborators.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ide-text-faint)]">Collaborators</p>
          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center border border-[var(--ide-border)] bg-[var(--ide-bg-panel)] py-6 text-sm text-[var(--ide-text-muted)]">
                Loading collaborators…
              </div>
            ) : members.length ? (
              members.map(member => {
                const canRemove = canInvite && member.role !== 'owner';
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between border border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ide-bg-hover)] text-sm font-semibold uppercase text-[var(--ide-text)]">
                        {member.name?.charAt(0) ?? member.username?.charAt(0) ?? 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--ide-text)]">{member.name ?? member.username ?? 'Unknown user'}</p>
                        <p className="text-xs text-[var(--ide-text-muted)]">{roleLabel(member.role)}</p>
                      </div>
                    </div>
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => onRemoveCollaborator(member.id)}
                        className="border border-[var(--ide-border)] px-3 py-1 text-xs font-medium text-[var(--ide-text-muted)] transition hover:border-[var(--ide-danger)]/50 hover:bg-[var(--ide-danger)]/10 hover:text-[#f2b8ae]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="border border-[var(--ide-border)] bg-[var(--ide-bg-panel)] px-3 py-4 text-sm text-[var(--ide-text-muted)]">
                No collaborators yet.
              </div>
            )}
          </div>
          {removeError ? <p className="mt-3 text-sm text-[#f2b8ae]">{removeError}</p> : null}
        </div>
      </div>
    </div>
  );
}
