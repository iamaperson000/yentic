'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Folder,
  FolderOpen,
  Menu,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  filterProjectsByQuery,
  getMenuActionsForScope,
  type HomeProjectSummary,
  type ProjectMenuAction,
  type ProjectScope,
} from '@/lib/projects-home';
import {
  getStarterProject,
  resolveWorkspaceSlugFromLanguage,
  type WorkspaceSlug,
  workspaceConfigs,
} from '@/lib/project';

type ProjectsResponse = {
  owned?: HomeProjectSummary[];
  shared?: HomeProjectSummary[];
};

type ProjectCreateResponse = {
  id: string;
};

const runtimeChoices: WorkspaceSlug[] = ['web', 'python', 'c', 'cpp', 'java'];

function formatUpdatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Updated recently';
  }

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Updated just now';
  }
  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `Updated ${minutes}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.max(1, Math.round(diffMs / hour));
    return `Updated ${hours}h ago`;
  }

  const days = Math.max(1, Math.round(diffMs / day));
  return `Updated ${days}d ago`;
}

function menuLabel(action: ProjectMenuAction) {
  if (action === 'open') return 'Open in IDE';
  if (action === 'rename') return 'Rename';
  if (action === 'delete') return 'Delete';
  return 'Share';
}

async function parseError(response: Response, fallback: string) {
  const raw = await response.text();
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      return parsed.error;
    }
    if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
      return parsed.message;
    }
  } catch {
    // ignore JSON parse errors
  }

  return raw;
}

export default function SignedInHomeShell() {
  const router = useRouter();

  const [activeScope, setActiveScope] = useState<ProjectScope>('owned');
  const [query, setQuery] = useState('');
  const [ownedProjects, setOwnedProjects] = useState<HomeProjectSummary[]>([]);
  const [sharedProjects, setSharedProjects] = useState<HomeProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createRuntime, setCreateRuntime] = useState<WorkspaceSlug>('web');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<HomeProjectSummary | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to load projects'));
      }

      const payload = (await response.json()) as ProjectsResponse;
      setOwnedProjects(payload.owned ?? []);
      setSharedProjects(payload.shared ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load projects';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const currentProjects = activeScope === 'owned' ? ownedProjects : sharedProjects;

  const filteredProjects = useMemo(() => {
    return filterProjectsByQuery(currentProjects, query);
  }, [currentProjects, query]);

  const menuActions = useMemo(() => {
    return getMenuActionsForScope(activeScope);
  }, [activeScope]);

  const openProject = useCallback(
    (projectId: string) => {
      router.push(`/${projectId}`);
    },
    [router],
  );

  const handleCreate = useCallback(async () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError('Project name is required.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          language: createRuntime,
          files: getStarterProject(createRuntime),
        }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to create project'));
      }

      const payload = (await response.json()) as ProjectCreateResponse;
      setIsCreateModalOpen(false);
      setCreateName('');
      router.push(`/${payload.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  }, [createName, createRuntime, router]);

  const handleRename = useCallback(async () => {
    if (!renameTarget) {
      return;
    }

    const trimmedName = renameDraft.trim();
    if (!trimmedName) {
      setRenameError('Project name is required.');
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    try {
      const response = await fetch(`/api/projects/${renameTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to rename project'));
      }

      const payload = (await response.json()) as { id: string; name: string; updatedAt: string };

      setOwnedProjects((projects) =>
        projects.map((project) =>
          project.id === payload.id
            ? { ...project, name: payload.name, updatedAt: payload.updatedAt }
            : project,
        ),
      );
      setSharedProjects((projects) =>
        projects.map((project) =>
          project.id === payload.id
            ? { ...project, name: payload.name, updatedAt: payload.updatedAt }
            : project,
        ),
      );

      setRenameTarget(null);
      setRenameDraft('');
      showFeedback('Project renamed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename project';
      setRenameError(message);
    } finally {
      setIsRenaming(false);
    }
  }, [renameDraft, renameTarget, showFeedback]);

  const handleDeleteOwnedProject = useCallback(async (project: HomeProjectSummary) => {
    const confirmed = window.confirm(`Delete "${project.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to delete project'));
      }

      setOwnedProjects((projects) => projects.filter((entry) => entry.id !== project.id));
      showFeedback('Project deleted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete project';
      showFeedback(message);
    }
  }, [showFeedback]);

  const handleShareOwnedProject = useCallback(async (project: HomeProjectSummary) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: false }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Failed to create share link'));
      }

      const payload = (await response.json()) as { url?: string };
      const rawUrl = payload.url ?? '';
      if (!rawUrl) {
        throw new Error('Share link was not returned by the server');
      }

      const fullUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${window.location.origin}${rawUrl}`;

      try {
        await navigator.clipboard.writeText(fullUrl);
        showFeedback('Share link copied to clipboard.');
      } catch {
        showFeedback(fullUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share link';
      showFeedback(message);
    }
  }, [showFeedback]);

  const handleActionSelect = useCallback(
    async (action: ProjectMenuAction, project: HomeProjectSummary) => {
      if (action === 'open') {
        openProject(project.id);
        return;
      }

      if (action === 'rename') {
        setRenameTarget(project);
        setRenameDraft(project.name);
        setRenameError(null);
        return;
      }

      if (action === 'delete') {
        await handleDeleteOwnedProject(project);
        return;
      }

      await handleShareOwnedProject(project);
    },
    [handleDeleteOwnedProject, handleShareOwnedProject, openProject],
  );

  const selectedTabCount = currentProjects.length;

  return (
    <section className="relative overflow-hidden rounded-[10px] border border-[var(--color-border-medium)] bg-[var(--color-bg-overlay)] text-[var(--color-text-primary)]">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_0%,rgba(220,229,240,0.18),transparent_45%),linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px]" />
      <div className="relative grid min-h-[72vh] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] px-4 py-5 lg:flex lg:flex-col">
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border-medium)] bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-border-strong)] hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>

          <div className="mt-6 space-y-1">
            <button
              type="button"
              className="inline-flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white"
            >
              <FolderOpen className="h-4 w-4" />
              Projects
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col bg-[var(--color-bg-primary)]/45">
          <header className="border-b border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)]/70 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition hover:text-white lg:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <h1 className="text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                  Projects
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/features"
                  className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:border-white/40"
                >
                  Features
                </Link>
                <Link
                  href="/ide"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-slate-200"
                >
                  Open IDE
                </Link>
                <p className="ml-1 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  {selectedTabCount} in view
                </p>
              </div>
            </div>
          </header>

          <section className="flex-1 space-y-4 px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects"
                  className="pl-9"
                />
              </div>

              <div className="inline-flex w-fit items-center rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] p-1">
                <button
                  type="button"
                  onClick={() => setActiveScope('owned')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    activeScope === 'owned'
                      ? 'bg-white/10 text-white'
                      : 'text-[var(--color-text-secondary)] hover:text-white'
                  }`}
                >
                  Owned ({ownedProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScope('shared')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    activeScope === 'shared'
                      ? 'bg-white/10 text-white'
                      : 'text-[var(--color-text-secondary)] hover:text-white'
                  }`}
                >
                  Shared ({sharedProjects.length})
                </button>
              </div>
            </div>

            {feedback ? (
              <div className="rounded-md border border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                {feedback}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-8 text-sm text-[var(--color-text-secondary)]">
                Loading projects…
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadProjects()}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-400/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            ) : null}

            {!isLoading && !loadError && filteredProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] px-5 py-10 text-center">
                <Folder className="mx-auto h-5 w-5 text-[var(--color-text-muted)]" />
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  {activeScope === 'owned'
                    ? query.trim()
                      ? 'No owned projects match your search.'
                      : 'No projects yet. Create your first project to get started.'
                    : query.trim()
                      ? 'No shared projects match your search.'
                      : 'Nothing has been shared with you yet.'}
                </p>
                {activeScope === 'owned' && !query.trim() ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-medium)] bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-border-strong)] hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                    Create project
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isLoading && !loadError && filteredProjects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => {
                  const resolvedSlug = resolveWorkspaceSlugFromLanguage(project.language);
                  const workspace = workspaceConfigs[resolvedSlug];
                  const ownerLabel =
                    activeScope === 'shared'
                      ? project.user?.username || project.user?.name || 'Unknown owner'
                      : null;

                  return (
                    <article
                      key={project.id}
                      className="relative overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:40px_40px]" />
                      <button
                        type="button"
                        onClick={() => openProject(project.id)}
                        className="relative w-full cursor-pointer pr-10 text-left"
                      >
                        <p className="truncate text-base font-semibold text-white">{project.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          {workspace?.title ?? project.language}
                        </p>
                        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                          {formatUpdatedAt(project.updatedAt)}
                        </p>
                        {ownerLabel ? (
                          <p className="mt-1 text-xs text-[var(--color-text-faint)]">Owner: {ownerLabel}</p>
                        ) : null}
                      </button>

                      <div className="absolute right-3 top-3 z-20">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuProjectId((prev) =>
                              prev === project.id ? null : project.id,
                            );
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--color-text-muted)] transition hover:border-[var(--color-border-medium)] hover:bg-white/5 hover:text-white"
                          aria-label={`Open actions for ${project.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        <Dropdown
                          open={menuProjectId === project.id}
                          onClose={() => setMenuProjectId(null)}
                          align="right"
                        >
                          {menuActions.map((action) => (
                            <DropdownItem
                              key={action}
                              destructive={action === 'delete'}
                              onSelect={() => {
                                setMenuProjectId(null);
                                void handleActionSelect(action, project);
                              }}
                            >
                              {menuLabel(action)}
                            </DropdownItem>
                          ))}
                        </Dropdown>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-black/70 lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="relative h-full w-[260px] border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Workspace
              </p>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border-medium)] text-[var(--color-text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border-medium)] bg-white/5 px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="mt-5 inline-flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white"
            >
              <FolderOpen className="h-4 w-4" />
              Projects
            </button>
          </aside>
        </div>
      ) : null}

      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          if (isCreating) {
            return;
          }
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        className="w-[min(92vw,460px)] p-5"
      >
        <h2 className="text-lg font-semibold text-white">New project</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Pick a runtime and start coding immediately.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Project name
            </label>
            <Input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="My project"
              error={createError ?? undefined}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Runtime
            </label>
            <select
              value={createRuntime}
              onChange={(event) => setCreateRuntime(event.target.value as WorkspaceSlug)}
              className="w-full rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
            >
              {runtimeChoices.map((runtime) => (
                <option key={runtime} value={runtime}>
                  {workspaceConfigs[runtime].title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:text-white"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
          >
            {isCreating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => {
          if (isRenaming) {
            return;
          }
          setRenameTarget(null);
          setRenameError(null);
        }}
        className="w-[min(92vw,440px)] p-5"
      >
        <h2 className="text-lg font-semibold text-white">Rename project</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Update the project name shown in your workspace list.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            New name
          </label>
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder="Project name"
            error={renameError ?? undefined}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRenameTarget(null)}
            className="rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition hover:text-white"
            disabled={isRenaming}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleRename()}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRenaming}
          >
            {isRenaming ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </section>
  );
}
