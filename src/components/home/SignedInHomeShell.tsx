'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
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
    <section
      className="relative overflow-hidden rounded-[12px] border"
      style={{ background: 'var(--y-ink)', borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
    >
      <div className="grid min-h-[72vh] lg:grid-cols-[236px_minmax(0,1fr)]">
        {/* sidebar */}
        <aside
          className="hidden flex-col border-r px-3 py-4 font-[family-name:var(--font-mono-code)] text-[12.5px] lg:flex"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
        >
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold"
            style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
          >
            <Plus className="h-4 w-4" /> New project
          </button>

          <p className="px-2 py-1 text-[11px]" style={{ color: 'var(--y-muted)' }}>Workspaces</p>
          <button
            type="button"
            onClick={() => setActiveScope('owned')}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left"
            style={
              activeScope === 'owned'
                ? { background: 'var(--y-sel-tint)', color: 'var(--y-fg)', borderLeft: '2px solid var(--y-brand)' }
                : { color: 'var(--y-muted)' }
            }
          >
            <span className="h-[6px] w-[6px] rounded-[2px]" style={{ background: 'var(--y-brand)' }} />
            All projects ({ownedProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveScope('shared')}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left"
            style={
              activeScope === 'shared'
                ? { background: 'var(--y-sel-tint)', color: 'var(--y-fg)', borderLeft: '2px solid var(--y-brand)' }
                : { color: 'var(--y-muted)' }
            }
          >
            <span className="h-[6px] w-[6px] rounded-[2px]" style={{ background: 'var(--y-str)' }} />
            Shared with me ({sharedProjects.length})
          </button>

          <p className="mt-4 px-2 py-1 text-[11px]" style={{ color: 'var(--y-muted)' }}>Runtimes</p>
          {(['python', 'c', 'cpp', 'java', 'web'] as WorkspaceSlug[]).map((slug) => (
            <span key={slug} className="px-2 py-1" style={{ color: 'var(--y-muted)' }}>
              {workspaceConfigs[slug].title}
            </span>
          ))}
        </aside>

        {/* main */}
        <main className="flex min-w-0 flex-col" style={{ background: 'var(--y-ink)' }}>
          <header
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6"
            style={{ borderColor: 'var(--y-line)' }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border lg:hidden"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]">
                {activeScope === 'owned' ? 'All projects' : 'Shared with me'}
              </h1>
            </div>
            <p className="font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-muted)' }}>
              {selectedTabCount} {selectedTabCount === 1 ? 'workspace' : 'workspaces'}
            </p>
          </header>

          <section className="flex-1 space-y-4 px-4 py-5 sm:px-6">
            <div className="relative w-full md:max-w-[360px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: 'var(--y-muted)' }}
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects"
                className="pl-9"
              />
            </div>

            {feedback ? (
              <div
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)', color: 'var(--y-fg)' }}
              >
                {feedback}
              </div>
            ) : null}

            {isLoading ? (
              <div
                className="rounded-xl border p-8 text-sm"
                style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)', color: 'var(--y-muted)' }}
              >
                Loading projects…
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div
                className="rounded-xl border p-6 text-sm"
                style={{ borderColor: 'var(--y-kw)', background: 'var(--y-sel-tint)', color: 'var(--y-fg)' }}
              >
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadProjects()}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold"
                  style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : null}

            {!isLoading && !loadError && filteredProjects.length === 0 ? (
              <div
                className="rounded-xl border border-dashed px-5 py-10 text-center"
                style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
              >
                <Folder className="mx-auto h-5 w-5" style={{ color: 'var(--y-muted)' }} />
                <p className="mt-3 text-sm" style={{ color: 'var(--y-muted)' }}>
                  {activeScope === 'owned'
                    ? query.trim()
                      ? 'No projects match your search.'
                      : 'No projects yet. Create your first one to get started.'
                    : query.trim()
                      ? 'No shared projects match your search.'
                      : 'Nothing has been shared with you yet.'}
                </p>
                {activeScope === 'owned' && !query.trim() ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                    style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
                  >
                    <Plus className="h-4 w-4" /> New project
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isLoading && !loadError && filteredProjects.length > 0 ? (
              <div className="flex flex-col">
                {filteredProjects.map((project) => {
                  const resolvedSlug = resolveWorkspaceSlugFromLanguage(project.language);
                  const workspace = workspaceConfigs[resolvedSlug];
                  const entry =
                    { web: 'index.html', python: 'main.py', c: 'main.c', cpp: 'main.cpp', java: 'App.java' }[
                      resolvedSlug
                    ] ?? 'main';
                  const ownerLabel =
                    activeScope === 'shared'
                      ? project.user?.username || project.user?.name || 'Unknown owner'
                      : null;

                  return (
                    <div
                      key={project.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b py-3.5"
                      style={{ borderColor: 'var(--y-line)' }}
                    >
                      <button
                        type="button"
                        onClick={() => openProject(project.id)}
                        className="min-w-0 truncate pr-2 text-left font-[family-name:var(--font-mono-code)] text-sm"
                        style={{ color: 'var(--y-fg)' }}
                      >
                        {project.name}
                        <span style={{ color: 'var(--y-muted)' }}>/{entry}</span>
                        {ownerLabel ? (
                          <span className="ml-2 text-[11.5px]" style={{ color: 'var(--y-muted)' }}>· {ownerLabel}</span>
                        ) : null}
                      </button>
                      <span
                        className="rounded-[5px] px-2 py-0.5 font-[family-name:var(--font-mono-code)] text-[11px]"
                        style={{ background: 'var(--y-sel-tint)', color: 'var(--y-brand)' }}
                      >
                        {workspace?.title ?? project.language}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className="hidden font-[family-name:var(--font-mono-code)] text-[11.5px] sm:inline"
                          style={{ color: 'var(--y-muted)' }}
                        >
                          {formatUpdatedAt(project.updatedAt)}
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuProjectId((prev) => (prev === project.id ? null : project.id));
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                            style={{ color: 'var(--y-muted)' }}
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
                      </div>
                    </div>
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
          <aside
            className="relative h-full w-[260px] border-r px-4 py-5 font-[family-name:var(--font-mono-code)] text-[12.5px]"
            style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
          >
            <div className="mb-5 flex items-center justify-between">
              <p style={{ color: 'var(--y-muted)' }}>workspace</p>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold"
              style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
            >
              <Plus className="h-4 w-4" /> New project
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveScope('owned');
                setIsMobileSidebarOpen(false);
              }}
              className="mt-4 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
              style={{ color: 'var(--y-fg)' }}
            >
              All projects ({ownedProjects.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveScope('shared');
                setIsMobileSidebarOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
              style={{ color: 'var(--y-fg)' }}
            >
              Shared with me ({sharedProjects.length})
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
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold" style={{ color: 'var(--y-fg)' }}>
          New project
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--y-muted)' }}>
          Pick a runtime and start coding.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-muted)' }}>
              Project name
            </label>
            <Input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="my-project"
              error={createError ?? undefined}
            />
          </div>

          <div>
            <label className="mb-1 block font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-muted)' }}>
              Runtime
            </label>
            <select
              value={createRuntime}
              onChange={(event) => setCreateRuntime(event.target.value as WorkspaceSlug)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)', color: 'var(--y-fg)' }}
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
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
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
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold" style={{ color: 'var(--y-fg)' }}>
          Rename project
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--y-muted)' }}>
          Update the name shown in your workspace list.
        </p>

        <div className="mt-4">
          <label className="mb-1 block font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-muted)' }}>
            New name
          </label>
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder="project name"
            error={renameError ?? undefined}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRenameTarget(null)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
            disabled={isRenaming}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleRename()}
            className="rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
            disabled={isRenaming}
          >
            {isRenaming ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </section>
  );
}
