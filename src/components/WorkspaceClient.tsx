'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { clsx } from 'clsx';

import { ChevronLeft, X } from 'lucide-react';

import { Editor } from '@/components/Editor';
import { FileExplorer } from '@/components/FileExplorer';
import { Preview } from '@/components/Preview';
import CollaborativeEditor from '@/components/CollaborativeEditor';
import PresenceAvatars from '@/components/PresenceAvatars';
import { ProjectShareModal } from '@/components/ProjectShareModal';
import { StatusBar } from '@/components/StatusBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  type CollaboratorInfo,
  type CollaboratorPresence,
  type ViewerRole,
} from '@/types/collaboration';
import {
  clearWorkspace,
  ensureUniquePath,
  getStarterProject,
  inferLanguage,
  loadWorkspaceFiles,
  resolveWorkspaceSlugFromLanguage,
  saveWorkspaceFiles,
  scaffoldFor,
  readWorkspaceMeta,
  type ProjectFileMap,
  type SupportedLanguage,
  type WorkspaceSlug,
  workspaceConfigs,
  writeWorkspaceMeta,
} from '@/lib/project';

const extensionMap: Record<SupportedLanguage, string> = {
  html: 'html',
  css: 'css',
  javascript: 'js',
  python: 'py',
  c: 'c',
  cpp: 'cpp',
  java: 'java'
};

function smartPlaceholder(base: string, language?: SupportedLanguage) {
  if (!language) return base;
  const extension = extensionMap[language];
  if (!extension) return base;
  const dotIndex = base.lastIndexOf('.');
  const baseName = dotIndex === -1 ? base : base.slice(0, dotIndex);
  const normalized = baseName.trim() || 'untitled';
  return `${normalized}.${extension}`;
}

function formatTime(date: Date | null) {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function colorForUser(userId: string) {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 75% 65%)`;
}

function sameTabOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

type WorkspaceClientProps = {
  workspaceId: string;
  initialSlug: WorkspaceSlug;
  initialProject: CloudProject | null;
  initialViewerRole: ViewerRole;
};

type CloudProject = {
  id: string;
  name: string;
  language: string;
  files: ProjectFileMap;
  updatedAt: string;
  yjsState?: string | null;
  viewerRole?: ViewerRole;
  collaborationKey?: string | null;
  shareToken?: string | null;
};

type ProjectMeta = {
  id: string | null;
  name: string;
  shareToken: string | null;
};

export default function WorkspaceClient({
  workspaceId,
  initialSlug,
  initialProject,
  initialViewerRole,
}: WorkspaceClientProps) {
  const router = useRouter();
  const [slug, setSlug] = useState<WorkspaceSlug>(initialSlug);
  const config = workspaceConfigs[slug] ?? workspaceConfigs.web;
  const { data: session } = useSession();
  const sessionUser = session?.user ?? null;

  const [files, setFilesState] = useState<ProjectFileMap>(() => initialProject?.files ?? getStarterProject(slug));
  const [activePath, setActivePath] = useState<string>(config.defaultActivePath);
  const [openTabs, setOpenTabs] = useState<string[]>(() => [config.defaultActivePath]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialProject?.updatedAt ? new Date(initialProject.updatedAt) : null
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [recentlyCreatedPath, setRecentlyCreatedPath] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const defaultProjectName = `${config.title} project`;
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(() => {
    const initialName = initialProject?.name?.trim();
    return {
      id: initialProject?.id ?? null,
      name: initialName && initialName.length > 0 ? initialName : defaultProjectName,
      shareToken: initialProject?.shareToken ?? null,
    };
  });
  const [projectNameDraft, setProjectNameDraft] = useState<string>(projectMeta.name);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [isNameRequired, setIsNameRequired] = useState(false);
  const [cloudAuthRequired, setCloudAuthRequired] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isLoadingCloudProject, setIsLoadingCloudProject] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveSkipRef = useRef(true);
  const cloudWarningShownRef = useRef(false);
  const loadedCloudProjectIdRef = useRef<string | null>(null);
  const namePromptInitializedRef = useRef(false);
  const defaultNameRef = useRef(defaultProjectName);
  const searchParams = useSearchParams();
  const [viewerRole, setViewerRole] = useState<ViewerRole>(initialViewerRole);
  const [encodedYjsState, setEncodedYjsState] = useState<string | null>(initialProject?.yjsState ?? null);
  const collaborativeSnapshotRef = useRef<string | null>(initialProject?.yjsState ?? null);
  const collaborativeDirtyRef = useRef(false);
  const collaborativeSaveInFlightRef = useRef(false);
  const [collaborationRoomKey, setCollaborationRoomKey] = useState<string | null>(
    initialProject?.collaborationKey ?? null
  );
  const collaborationKey = projectMeta.id ? collaborationRoomKey : workspaceId;
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [inviteValue, setInviteValue] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [projectOwner, setProjectOwner] = useState<CollaboratorInfo | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareUrlError, setShareUrlError] = useState<string | null>(null);
  const [isShareUrlLoading, setIsShareUrlLoading] = useState(false);
  const [liveCollaborators, setLiveCollaborators] = useState<CollaboratorPresence[]>([]);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorColumn, setCursorColumn] = useState<number>(1);

  useKeyboardShortcuts(useMemo(() => [
    { key: 'b', meta: true, handler: () => setShowExplorer(prev => !prev) },
    { key: '\\', meta: true, handler: () => setShowPreview(prev => !prev) },
  ], []));

  const localCollaboratorPresence = sessionUser?.id
    ? {
        id: sessionUser.id,
        name:
          (typeof sessionUser.name === 'string' && sessionUser.name.trim()) ||
          (typeof sessionUser.email === 'string' && sessionUser.email.length > 0
            ? sessionUser.email.split('@')[0]
            : null),
        color: colorForUser(sessionUser.id),
        avatar:
          typeof sessionUser.image === 'string' && sessionUser.image.length > 0
            ? sessionUser.image
            : null,
      }
    : null;

  const updateFiles = useCallback(
    (updater: ProjectFileMap | ((prev: ProjectFileMap) => ProjectFileMap)) => {
      setFilesState(prev =>
        typeof updater === 'function' ? (updater as (prev: ProjectFileMap) => ProjectFileMap)(prev) : (updater as ProjectFileMap)
      );
    },
    []
  );

  const activatePath = useCallback((path: string) => {
    setActivePath(path);
    setOpenTabs(previous => (previous.includes(path) ? previous : [...previous, path]));
  }, []);

  useEffect(() => {
    if (initialProject?.id) {
      loadedCloudProjectIdRef.current = initialProject.id;
    }
  }, [initialProject?.id]);

  const handleCollaborativeFilesChange = useCallback(
    (next: ProjectFileMap) => {
      autoSaveSkipRef.current = true;
      setFilesState(() => next);
      saveWorkspaceFiles(workspaceId, next);
      if (!next[activePath]) {
        const fallback = next[config.defaultActivePath]
          ? config.defaultActivePath
          : Object.keys(next).sort((a, b) => a.localeCompare(b))[0] ?? config.defaultActivePath;
        setActivePath(fallback);
      }
    },
    [activePath, config.defaultActivePath, workspaceId]
  );

  const handleSnapshotChange = useCallback(
    (snapshot: string | null) => {
      collaborativeSnapshotRef.current = snapshot;
      setEncodedYjsState(snapshot ?? null);
    },
    [],
  );

  const markRemoteMutation = useCallback(() => {
    collaborativeDirtyRef.current = true;
  }, []);

  const handleBackToWorkspaces = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      router.push('/ide');
    },
    [router],
  );

  useEffect(() => {
    if (!activePath || !files[activePath]) {
      return;
    }

    setOpenTabs(previous => {
      const nextTabs = previous.filter(path => files[path]);
      if (!nextTabs.includes(activePath)) {
        nextTabs.push(activePath);
      }
      if (!nextTabs.length) {
        nextTabs.push(activePath);
      }
      return sameTabOrder(previous, nextTabs) ? previous : nextTabs;
    });
  }, [activePath, files]);

  useEffect(() => {
    if (isNameRequired) {
      return;
    }
    setProjectNameDraft(projectMeta.name);
  }, [projectMeta.name, isNameRequired]);

  useEffect(() => {
    if (namePromptInitializedRef.current) {
      return;
    }
    if (!projectMeta.id && projectMeta.name === defaultProjectName) {
      namePromptInitializedRef.current = true;
      setIsNameRequired(true);
      setIsRenamingProject(true);
      setProjectNameDraft('');
    }
  }, [defaultProjectName, projectMeta.id, projectMeta.name]);

  useEffect(() => {
    if (projectMeta.id) {
      defaultNameRef.current = defaultProjectName;
      return;
    }
    const normalized = projectMeta.name.trim();
    if (normalized.length === 0 || normalized === defaultNameRef.current) {
      defaultNameRef.current = defaultProjectName;
      setProjectMeta(prev => ({ ...prev, name: defaultProjectName }));
      setProjectNameDraft(defaultProjectName);
    } else {
      defaultNameRef.current = defaultProjectName;
    }
  }, [defaultProjectName, projectMeta.id, projectMeta.name]);

  useEffect(() => {
    if (!isRenamingProject || typeof window === 'undefined') {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      projectNameInputRef.current?.focus();
      projectNameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isRenamingProject]);

  useEffect(() => {
    if (initialProject || typeof window === 'undefined') {
      return;
    }
    const storedMeta = readWorkspaceMeta(workspaceId);
    if (storedMeta) {
      setSlug(prev => (prev === storedMeta.slug ? prev : storedMeta.slug));
      if (storedMeta.name && storedMeta.name.trim().length > 0) {
      setProjectMeta(prev => ({ ...prev, name: storedMeta.name }));
      }
    }
  }, [initialProject, workspaceId]);

  useEffect(() => {
    autoSaveSkipRef.current = true;
    if (initialProject) {
      if (initialProject.files && Object.keys(initialProject.files).length) {
        updateFiles(initialProject.files);
        const preferred = initialProject.files[config.defaultActivePath]
          ? config.defaultActivePath
          : Object.keys(initialProject.files).sort((a, b) => a.localeCompare(b))[0] ?? config.defaultActivePath;
        setActivePath(preferred);
        setOpenTabs([preferred]);
        saveWorkspaceFiles(workspaceId, initialProject.files);
      }
      setEncodedYjsState(initialProject.yjsState ?? null);
      setCollaborationRoomKey(initialProject.collaborationKey ?? null);
      setViewerRole(initialViewerRole);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const stored = loadWorkspaceFiles(workspaceId, slug);
    if (stored && Object.keys(stored).length) {
      updateFiles(stored);
      const preferred = stored[config.defaultActivePath]
        ? config.defaultActivePath
        : Object.keys(stored).sort((a, b) => a.localeCompare(b))[0] ?? config.defaultActivePath;
      setActivePath(preferred);
      setOpenTabs([preferred]);
    } else {
      const starter = getStarterProject(slug);
      updateFiles(starter);
      setActivePath(config.defaultActivePath);
      setOpenTabs([config.defaultActivePath]);
      saveWorkspaceFiles(workspaceId, starter);
    }
    setEncodedYjsState(null);
    setCollaborationRoomKey(null);
    setViewerRole('owner');
    setCollaborators([]);
    setProjectOwner(null);
    setShareUrl(null);
    setShareUrlError(null);
    setIsShareUrlLoading(false);
  }, [
    config.defaultActivePath,
    initialProject,
    initialViewerRole,
    slug,
    updateFiles,
    workspaceId,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    writeWorkspaceMeta(workspaceId, {
      slug,
      name: projectMeta.name,
    });
  }, [projectMeta.name, slug, workspaceId]);

  useEffect(() => {
    const intent = searchParams?.get('new');
    if (intent !== '1') {
      return;
    }

    if (typeof window !== 'undefined') {
      clearWorkspace(workspaceId);
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState(null, '', url.toString());
    }

    namePromptInitializedRef.current = false;
    autoSaveSkipRef.current = true;
    const starter = getStarterProject(slug);
    updateFiles(starter);
    setActivePath(config.defaultActivePath);
    setOpenTabs([config.defaultActivePath]);
    saveWorkspaceFiles(workspaceId, starter);
    setProjectMeta({ id: null, name: defaultProjectName, shareToken: null });
    setCollaborationRoomKey(null);
    setProjectNameDraft('');
    setIsNameRequired(true);
    setIsRenamingProject(true);
    setLastSavedAt(null);
    setCloudError(null);
    setCloudAuthRequired(false);
    setIsSaving(false);
    setIsLoadingCloudProject(false);
    setRecentlyCreatedPath(null);
    setViewerRole('owner');
    setEncodedYjsState(null);
    setCollaborators([]);
    setProjectOwner(null);
    setShareModalOpen(false);
    setInviteValue('');
    setInviteError(null);
    setRemoveError(null);
    setIsInviteSubmitting(false);
    setIsLoadingCollaborators(false);
    setShareUrl(null);
    setShareUrlError(null);
    setIsShareUrlLoading(false);
    cloudWarningShownRef.current = false;
    loadedCloudProjectIdRef.current = null;
  }, [
    config.defaultActivePath,
    defaultProjectName,
    searchParams,
    slug,
    workspaceId,
    updateFiles,
  ]);

  const code = files[activePath]?.code ?? '';
  const lang = files[activePath]?.language ?? 'javascript';

  const setActiveCode = useCallback(
    (next: string) => {
      updateFiles(prev => {
        const target = prev[activePath];
        if (!target) return prev;
        return { ...prev, [activePath]: { ...target, code: next } };
      });
    },
    [activePath, updateFiles]
  );

  const onRename = useCallback(
    (oldPath: string, newPathRaw: string): string | null => {
      if (viewerRole === 'viewer') {
        return 'Viewers cannot rename files.';
      }
      const nextPath = newPathRaw.trim();
      if (!nextPath) {
        return 'File name cannot be empty.';
      }
      if (nextPath === oldPath) {
        return null;
      }

      let error: string | null = null;
      let renamed = false;

      updateFiles(prev => {
        if (!prev[oldPath]) {
          error = 'The original file could not be found.';
          return prev;
        }
        if (prev[nextPath]) {
          error = 'A file with that name already exists.';
          return prev;
        }

        const { [oldPath]: oldFile, ...rest } = prev;
        const nextLanguage = inferLanguage(nextPath);
        renamed = true;
        return { ...rest, [nextPath]: { ...oldFile, path: nextPath, language: nextLanguage } };
      });

      if (!error && renamed) {
        setOpenTabs(previous => previous.map(path => (path === oldPath ? nextPath : path)));
      }

      if (!error && renamed && activePath === oldPath) {
        setActivePath(nextPath);
      }

      return error;
    },
    [activePath, updateFiles, viewerRole]
  );

  const onDelete = useCallback((path: string) => {
    if (viewerRole === 'viewer') {
      return;
    }
    let nextActivePath = activePath;
    let shouldUpdateActive = false;

    updateFiles(prev => {
      if (!prev[path]) return prev;
      const nextFiles = { ...prev };
      delete nextFiles[path];
      const remaining = Object.keys(nextFiles).sort((a, b) => a.localeCompare(b));

      if (!remaining.length) {
        nextActivePath = config.defaultActivePath;
        shouldUpdateActive = true;
        return getStarterProject(slug);
      }

      if (path === activePath) {
        nextActivePath = remaining[0];
        shouldUpdateActive = true;
      }

      return nextFiles;
    });

    setOpenTabs(previous => previous.filter(tabPath => tabPath !== path));
    if (shouldUpdateActive) {
      setActivePath(nextActivePath);
    }
  }, [activePath, slug, config.defaultActivePath, updateFiles, viewerRole]);

  const onCreate = useCallback((rawPath: string): string => {
    const desired = rawPath.trim() || config.newFilePlaceholder;
    let nextPath = desired;
    updateFiles(prev => {
      const safePath = ensureUniquePath(desired, prev);
      nextPath = safePath;
      const fileLanguage = inferLanguage(safePath);
      return {
        ...prev,
        [safePath]: {
          path: safePath,
          language: fileLanguage,
          code: scaffoldFor(safePath, fileLanguage),
        },
      };
    });
    setActivePath(nextPath);
    return nextPath;
  }, [config.newFilePlaceholder, updateFiles]);

  const closeTab = useCallback((path: string) => {
    let nextActive: string | null = null;

    setOpenTabs(previous => {
      if (!previous.includes(path) || previous.length === 1) {
        return previous;
      }

      const index = previous.indexOf(path);
      const nextTabs = previous.filter(tabPath => tabPath !== path);
      if (activePath === path) {
        nextActive = nextTabs[index] ?? nextTabs[index - 1] ?? nextTabs[0] ?? null;
      }
      return nextTabs;
    });

    if (nextActive) {
      setActivePath(nextActive);
    }
  }, [activePath]);

  const pushToast = useCallback((next: { kind: 'success' | 'error'; message: string }) => {
    setToast(next);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3600);
  }, []);

  const applyCloudProject = useCallback(
    (project: CloudProject, options?: { silent?: boolean }) => {
      autoSaveSkipRef.current = true;
      saveWorkspaceFiles(workspaceId, project.files);
      updateFiles(project.files);
      const firstPath = Object.keys(project.files).sort()[0] || config.defaultActivePath;
      setActivePath(firstPath);
      setOpenTabs([firstPath]);
      const normalizedName = project.name.trim() || defaultProjectName;
      setProjectMeta({ id: project.id, name: normalizedName, shareToken: project.shareToken ?? null });
      setCollaborationRoomKey(project.collaborationKey ?? null);
      setIsNameRequired(false);
      setLastSavedAt(new Date(project.updatedAt ?? Date.now()));
      setCloudAuthRequired(false);
      setCloudError(null);
      setViewerRole(project.viewerRole ?? 'owner');
      collaborativeSnapshotRef.current = project.yjsState ?? null;
      setEncodedYjsState(project.yjsState ?? null);
      collaborativeDirtyRef.current = false;
      if (!options?.silent) {
        pushToast({ kind: 'success', message: `Loaded project: ${normalizedName}` });
      }
    },
    [config.defaultActivePath, defaultProjectName, pushToast, updateFiles, workspaceId]
  );

  const persistProject = useCallback(
    async (
      context: 'auto' | 'manual' | 'rename',
      overrides?: {
        files?: ProjectFileMap;
        name?: string;
        keepalive?: boolean;
      }
    ) => {
      const filesToPersist = overrides?.files ?? files;

      if (viewerRole === 'viewer') {
        return { ok: false as const, reason: 'forbidden' as const };
      }
      if (!filesToPersist || !Object.keys(filesToPersist).length) {
        return { ok: false as const, reason: 'empty' as const };
      }

      const normalizedName = (overrides?.name ?? projectMeta.name).trim() || defaultProjectName;
      if (normalizedName !== projectMeta.name) {
        setProjectMeta(prev => ({ ...prev, name: normalizedName }));
      }

      saveWorkspaceFiles(workspaceId, filesToPersist);

      let yStateBase64: string | null = collaborativeSnapshotRef.current ?? null;
      if (!yStateBase64 && encodedYjsState) {
        yStateBase64 = encodedYjsState;
      }

      setIsSaving(true);
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: Boolean(overrides?.keepalive),
          body: JSON.stringify({
            id: projectMeta.id ?? undefined,
            name: normalizedName,
            language: slug,
            files: filesToPersist,
            yjsState: yStateBase64,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          setCloudAuthRequired(true);
          setCloudError(
            res.status === 403 ? 'Finish setting up your profile to sync projects.' : 'Sign in to sync projects.'
          );
          if (!cloudWarningShownRef.current) {
            cloudWarningShownRef.current = true;
            pushToast({
              kind: 'error',
              message:
                res.status === 403
                  ? 'Finish setting up your profile to sync projects.'
                  : 'Sign in to sync projects to the cloud.',
            });
          }
          return {
            ok: false as const,
            reason: res.status === 403 ? ('forbidden' as const) : ('unauthorized' as const),
          };
        }

        if (!res.ok) {
          const raw = await res.text();
          let message = raw;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (typeof (parsed as { error?: unknown }).error === 'string') {
                message = (parsed as { error: string }).error;
              } else if (typeof (parsed as { message?: unknown }).message === 'string') {
                message = (parsed as { message: string }).message;
              }
            }
          } catch {
            // ignore parse errors
          }
          message = message || 'Save failed';
          setCloudError(message);
          if (context !== 'auto') {
            pushToast({ kind: 'error', message: `Save failed: ${message}` });
          }
          return { ok: false as const, reason: 'error' as const, message };
        }

        const project = (await res.json()) as CloudProject;
        const syncedName = project.name.trim() || normalizedName;
        setProjectMeta(prev => ({
          id: project.id,
          name: syncedName,
          shareToken: project.shareToken ?? prev.shareToken ?? null,
        }));
        setCollaborationRoomKey(project.collaborationKey ?? null);
        setLastSavedAt(new Date(project.updatedAt ?? Date.now()));
        setCloudAuthRequired(false);
        setCloudError(null);
        cloudWarningShownRef.current = false;
        setIsNameRequired(false);
        setViewerRole(project.viewerRole ?? (projectMeta.id ? viewerRole : 'owner'));
        collaborativeSnapshotRef.current = project.yjsState ?? null;
        setEncodedYjsState(project.yjsState ?? null);
        collaborativeDirtyRef.current = false;
        return { ok: true as const, project };
      } catch (error) {
        console.error('Save failed:', error);
        setCloudError('Network error');
        if (context !== 'auto') {
          pushToast({ kind: 'error', message: 'Save failed: network or auth issue' });
        }
        return { ok: false as const, reason: 'error' as const, message: 'network' };
      } finally {
        setIsSaving(false);
      }
    },
    [
      defaultProjectName,
      encodedYjsState,
      files,
      projectMeta.id,
      projectMeta.name,
      pushToast,
      slug,
      workspaceId,
      viewerRole,
    ]
  );

  const persistProjectRef = useRef(persistProject);

  useEffect(() => {
    persistProjectRef.current = persistProject;
  }, [persistProject]);

  useEffect(() => {
    if (viewerRole === 'viewer') return;
    if (!files || !Object.keys(files).length) return;
    if (autoSaveSkipRef.current) {
      autoSaveSkipRef.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      void persistProjectRef.current('auto');
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [files, viewerRole]);

  const flushCollaborativeState = useCallback((options?: { keepalive?: boolean }) => {
    if (viewerRole === 'viewer') {
      return Promise.resolve(false);
    }
    if (!projectMeta.id) {
      return Promise.resolve(false);
    }
    if (!collaborativeDirtyRef.current) {
      return Promise.resolve(false);
    }
    if (collaborativeSaveInFlightRef.current) {
      return Promise.resolve(false);
    }
    collaborativeSaveInFlightRef.current = true;
    return persistProject('auto', { keepalive: options?.keepalive }).finally(() => {
      collaborativeSaveInFlightRef.current = false;
    });
  }, [persistProject, projectMeta.id, viewerRole]);

  useEffect(() => {
    if (!projectMeta.id) return;
    if (viewerRole === 'viewer') return;
    const interval = window.setInterval(() => {
      void flushCollaborativeState();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [flushCollaborativeState, projectMeta.id, viewerRole]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!projectMeta.id) {
      return;
    }
    if (viewerRole === 'viewer') {
      return;
    }
    const handleBeforeUnload = () => {
      void flushCollaborativeState({ keepalive: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushCollaborativeState({ keepalive: true });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushCollaborativeState, projectMeta.id, viewerRole]);

  const syncCollaborationMetadata = useCallback(async () => {
    if (!projectMeta.id) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectMeta.id}/collaboration`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as {
        collaborationKey?: string | null;
        shareToken?: string | null;
      };

      if (
        typeof data.collaborationKey === 'string' &&
        data.collaborationKey.length > 0 &&
        data.collaborationKey !== collaborationRoomKey
      ) {
        setCollaborationRoomKey(data.collaborationKey);
      }

      if (viewerRole === 'owner' && data.shareToken !== undefined) {
        setProjectMeta(prev => ({ ...prev, shareToken: data.shareToken ?? null }));
      }
    } catch (error) {
      console.error('Failed to sync collaboration metadata', error);
    }
  }, [collaborationRoomKey, projectMeta.id, viewerRole]);

  useEffect(() => {
    if (!projectMeta.id) {
      return;
    }

    void syncCollaborationMetadata();
    const interval = window.setInterval(() => {
      void syncCollaborationMetadata();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [projectMeta.id, syncCollaborationMetadata]);

  const loadCollaborators = useCallback(async () => {
    if (!projectMeta.id) {
      return;
    }
    setIsLoadingCollaborators(true);
    setInviteError(null);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/projects/${projectMeta.id}/collaborators`, { cache: 'no-store' });
      if (!res.ok) {
        const raw = await res.text();
        let message = 'Failed to load collaborators';
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
            message = parsed.error;
          }
        } catch {
          if (raw) {
            message = raw;
          }
        }
        setInviteError(message);
        setProjectOwner(null);
        setCollaborators([]);
        return;
      }
      const data = (await res.json()) as { owner: CollaboratorInfo; collaborators: CollaboratorInfo[] };
      setProjectOwner(data.owner);
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Failed to load collaborators', error);
      setInviteError('Failed to load collaborators');
      setProjectOwner(null);
      setCollaborators([]);
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [projectMeta.id]);

  const fetchShareUrl = useCallback(
    async (options?: { rotate?: boolean }) => {
      if (!projectMeta.id || viewerRole !== 'owner') {
        setShareUrl(null);
        setShareUrlError(null);
        setIsShareUrlLoading(false);
        return;
      }
      setIsShareUrlLoading(true);
      setShareUrlError(null);
      try {
        const init: RequestInit = { method: 'POST' };
        if (options?.rotate) {
          init.headers = { 'Content-Type': 'application/json' };
          init.body = JSON.stringify({ rotate: true });
        }
        const res = await fetch(`/api/projects/${projectMeta.id}/share`, init);
        if (!res.ok) {
          const raw = await res.text();
          let message = 'Failed to generate share link';
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (typeof (parsed as { error?: unknown }).error === 'string') {
                message = (parsed as { error: string }).error;
              } else if (typeof (parsed as { message?: unknown }).message === 'string') {
                message = (parsed as { message: string }).message;
              }
            }
          } catch {
            if (raw) {
              message = raw;
            }
          }
          setShareUrlError(message);
          setShareUrl(null);
          return;
        }
        const data = (await res.json()) as { url: string; token?: string };
        setShareUrl(data.url);
        if (data.token) {
          setProjectMeta(prev => ({ ...prev, shareToken: data.token ?? prev.shareToken }));
        }
        setShareUrlError(null);
      } catch (error) {
        console.error('Failed to generate share link', error);
        setShareUrl(null);
        setShareUrlError('Failed to generate share link');
      } finally {
        setIsShareUrlLoading(false);
      }
    },
    [projectMeta.id, viewerRole]
  );

  const rotateShareUrl = useCallback(() => {
    void fetchShareUrl({ rotate: true });
  }, [fetchShareUrl]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) {
      return;
    }
    if (typeof window === 'undefined' || !navigator?.clipboard) {
      setShareUrlError('Clipboard not available');
      return;
    }
    try {
      const fullUrl = new URL(shareUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(fullUrl);
      setShareUrlError(null);
      pushToast({ kind: 'success', message: 'Copied share link to clipboard' });
    } catch (error) {
      console.error('Failed to copy share link', error);
      setShareUrlError('Failed to copy link');
    }
  }, [pushToast, shareUrl]);

  const openShareModal = useCallback(() => {
    if (!projectMeta.id) {
      return;
    }
    setShareModalOpen(true);
    setInviteValue('');
    setInviteError(null);
    setRemoveError(null);
    setShareUrlError(null);
    void loadCollaborators();
    void fetchShareUrl();
  }, [fetchShareUrl, loadCollaborators, projectMeta.id]);

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
    setInviteValue('');
    setInviteError(null);
    setRemoveError(null);
    setIsInviteSubmitting(false);
    setShareUrl(null);
    setShareUrlError(null);
    setIsShareUrlLoading(false);
  }, []);

  const handleInviteSubmit = useCallback(async () => {
    if (!projectMeta.id) {
      return;
    }
    const value = inviteValue.trim();
    if (!value) {
      setInviteError('Enter a username to invite.');
      return;
    }
    setIsInviteSubmitting(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/projects/${projectMeta.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let message = 'Failed to invite collaborator';
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
            message = parsed.error;
          }
        } catch {
          if (raw) {
            message = raw;
          }
        }
        setInviteError(message);
        return;
      }
      const data = (await res.json()) as { collaborator: CollaboratorInfo };
      setCollaborators(prev => {
        const index = prev.findIndex(entry => entry.id === data.collaborator.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = data.collaborator;
          return next;
        }
        return [...prev, data.collaborator];
      });
      setInviteValue('');
      setInviteError(null);
    } catch (error) {
      console.error('Failed to invite collaborator', error);
      setInviteError('Failed to invite collaborator');
    } finally {
      setIsInviteSubmitting(false);
    }
  }, [inviteValue, projectMeta.id]);

  const handleRemoveCollaborator = useCallback(
    async (userId: string) => {
      if (!projectMeta.id) {
        return;
      }
      setRemoveError(null);
      try {
        const res = await fetch(`/api/projects/${projectMeta.id}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          const raw = await res.text();
          let message = 'Failed to remove collaborator';
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
              message = parsed.error;
            }
          } catch {
            if (raw) {
              message = raw;
            }
          }
          setRemoveError(message);
          return;
        }
        const data = (await res.json()) as {
          ok: true;
          collaborationKey?: string | null;
          shareToken?: string | null;
          shareUrl?: string | null;
        };
        setCollaborators(prev => prev.filter(entry => entry.id !== userId));
        if (typeof data.collaborationKey === 'string' && data.collaborationKey.length > 0) {
          setCollaborationRoomKey(data.collaborationKey);
        }
        if (typeof data.shareToken === 'string' && data.shareToken.length > 0) {
          setProjectMeta(prev => ({ ...prev, shareToken: data.shareToken ?? prev.shareToken }));
        }
        if (typeof data.shareUrl === 'string' && data.shareUrl.length > 0) {
          setShareUrl(data.shareUrl);
        }
      } catch (error) {
        console.error('Failed to remove collaborator', error);
        setRemoveError('Failed to remove collaborator');
      }
    },
    [projectMeta.id]
  );

  const beginProjectRename = useCallback(() => {
    if (viewerRole !== 'owner' || isRenamingProject) {
      return;
    }
    setIsNameRequired(false);
    setProjectNameDraft(projectMeta.name);
    setIsRenamingProject(true);
  }, [isRenamingProject, projectMeta.name, viewerRole]);

  const cancelProjectRename = useCallback(() => {
    if (isNameRequired) {
      pushToast({ kind: 'error', message: 'Name your project to continue.' });
      setIsRenamingProject(true);
      return;
    }
    setIsRenamingProject(false);
    setProjectNameDraft(projectMeta.name);
  }, [isNameRequired, projectMeta.name, pushToast]);

  const commitProjectRename = useCallback(() => {
    if (viewerRole !== 'owner') {
      setIsRenamingProject(false);
      return;
    }
    const previousName = projectMeta.name;
    const trimmed = projectNameDraft.trim();
    if (!trimmed) {
      pushToast({ kind: 'error', message: 'Project name cannot be empty.' });
      if (isNameRequired) {
        setProjectNameDraft('');
        setIsRenamingProject(true);
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            projectNameInputRef.current?.focus();
          });
        }
        return;
      }
      setProjectNameDraft(projectMeta.name);
      setIsRenamingProject(false);
      return;
    }
    if (trimmed === projectMeta.name) {
      setIsRenamingProject(false);
      setIsNameRequired(false);
      return;
    }
    autoSaveSkipRef.current = true;
    setProjectMeta(prev => ({ ...prev, name: trimmed }));
    setIsRenamingProject(false);
    setIsNameRequired(false);
    void persistProjectRef.current('rename', { name: trimmed }).then(result => {
      const isLocalOnlyRename =
        !projectMeta.id && (result.reason === 'unauthorized' || result.reason === 'error');

      if (result.ok || isLocalOnlyRename) {
        pushToast({
          kind: 'success',
          message: isNameRequired ? `Project named ${trimmed}` : `Renamed project to ${trimmed}`,
        });
        return;
      }

      if (projectMeta.id) {
        setProjectMeta(prev => ({ ...prev, name: previousName }));
        setProjectNameDraft(previousName);
      }
    });
  }, [isNameRequired, projectMeta.id, projectMeta.name, projectNameDraft, pushToast, viewerRole]);

  useEffect(() => {
    const projectId = projectMeta.id;
    if (!projectId || loadedCloudProjectIdRef.current === projectId) {
      return;
    }

    loadedCloudProjectIdRef.current = projectId;
    autoSaveSkipRef.current = true;
    let cancelled = false;
    setIsLoadingCloudProject(true);

    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' });
        if (res.status === 401) {
          if (!cancelled) {
            setCloudAuthRequired(true);
            pushToast({ kind: 'error', message: 'Sign in to load cloud projects.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        if (res.status === 404) {
          if (!cancelled) {
            pushToast({ kind: 'error', message: 'Project not found or inaccessible.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            pushToast({ kind: 'error', message: 'Failed to load project from cloud.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        const project = (await res.json()) as CloudProject;
        const targetSlug = resolveWorkspaceSlugFromLanguage(project.language, slug);
        if (targetSlug !== slug) {
          if (!cancelled) {
            pushToast({ kind: 'error', message: 'Project belongs to a different workspace.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        if (!cancelled) {
          applyCloudProject(project);
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        if (!cancelled) {
          pushToast({ kind: 'error', message: 'Failed to load project from cloud.' });
          loadedCloudProjectIdRef.current = null;
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCloudProject(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyCloudProject, projectMeta.id, pushToast, slug]);

  const sandpackFiles = useMemo(() => {
    const map: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => {
      map[`/${f.path}`] = { code: f.code };
    });
    return map;
  }, [files]);

  const visibleTabs = useMemo(() => openTabs.filter(path => files[path]), [files, openTabs]);
  const formattedTime = formatTime(lastSavedAt);
  const orderedLiveCollaborators = useMemo(() => {
    if (!liveCollaborators.length) {
      return [] as CollaboratorPresence[];
    }
    return [...liveCollaborators].sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      if (a.userId === b.userId) return a.clientId.localeCompare(b.clientId);
      return a.userId.localeCompare(b.userId);
    });
  }, [liveCollaborators]);
  let savedLabel: string;
  if (isLoadingCloudProject) {
    savedLabel = 'Loading project…';
  } else if (cloudAuthRequired) {
    savedLabel = 'Not syncing (sign in)';
  } else if (cloudError) {
    savedLabel = 'Sync issue';
  } else if (isSaving) {
    savedLabel = 'Saving…';
  } else if (formattedTime) {
    savedLabel = `Saved at ${formattedTime}`;
  } else if (lastSavedAt) {
    savedLabel = 'Synced to cloud';
  } else {
    savedLabel = 'Local backup only';
  }

  const canEdit = viewerRole !== 'viewer';
  const shareButtonDisabled = !projectMeta.id;
  const canManageShareLink = viewerRole === 'owner' && !shareButtonDisabled;
  const statusBadgeClass = clsx(
    'inline-flex h-6 items-center gap-2 border px-2 text-[10px] font-medium uppercase tracking-[0.12em]',
    cloudAuthRequired
      ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
      : cloudError
        ? 'border-[var(--ide-danger)]/50 bg-[var(--ide-danger)]/10 text-[#f2b8ae]'
        : isSaving || isLoadingCloudProject
          ? 'border-amber-300/40 bg-amber-500/10 text-amber-100'
          : 'border-[var(--ide-border-strong)] bg-[var(--ide-bg-panel)] text-[var(--ide-text-muted)]'
  );
  const chromeButtonClass =
    'inline-flex h-7 items-center border px-2.5 text-[11px] font-medium text-[var(--ide-text-muted)] transition hover:border-[var(--ide-border-strong)] hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ide-accent)] disabled:cursor-not-allowed disabled:opacity-40';
  const activeChromeButtonClass =
    'border-[var(--ide-border-strong)] bg-[var(--ide-bg-active)] text-[var(--ide-text)]';
  const shareButtonClass = clsx(
    chromeButtonClass,
    viewerRole === 'owner' && !shareButtonDisabled && activeChromeButtonClass
  );

  const createSmartFile = useCallback(() => {
    if (viewerRole === 'viewer') {
      pushToast({ kind: 'error', message: 'Viewers cannot create files.' });
      return;
    }
    const activeFile = files[activePath];
    const activeLanguage = activeFile?.language;
    const placeholder = smartPlaceholder(config.newFilePlaceholder, activeLanguage);
    const createdPath = onCreate(placeholder);
    setOpenTabs(previous => (previous.includes(createdPath) ? previous : [...previous, createdPath]));
    setRecentlyCreatedPath(createdPath);
    pushToast({ kind: 'success', message: `Created file ${createdPath}` });
  }, [files, activePath, config.newFilePlaceholder, onCreate, pushToast, viewerRole]);

  const resetWorkspace = useCallback(() => {
    if (viewerRole !== 'owner') {
      pushToast({ kind: 'error', message: 'Only owners can reset the workspace.' });
      return;
    }
    const confirmed = window.confirm(
      'Reset this workspace to the starter files? This will replace your current files.'
    );
    if (!confirmed) {
      return;
    }
    const starter = getStarterProject(slug);
    autoSaveSkipRef.current = true;
    updateFiles(starter);
    setActivePath(config.defaultActivePath);
    setOpenTabs([config.defaultActivePath]);
    saveWorkspaceFiles(workspaceId, starter);
    if (!projectMeta.id) {
      setLastSavedAt(null);
    }
    setIsSaving(false);
    setCloudError(null);
    if (projectMeta.id) {
      void persistProjectRef.current('manual', { files: starter });
    }
  }, [slug, config.defaultActivePath, projectMeta.id, updateFiles, viewerRole, pushToast, workspaceId]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!recentlyCreatedPath) return;
    const timeout = window.setTimeout(() => setRecentlyCreatedPath(null), 0);
    return () => window.clearTimeout(timeout);
  }, [recentlyCreatedPath]);

  const content = (
    <div className="ide-shell flex min-h-screen flex-col bg-[var(--ide-bg-app)] text-[var(--ide-text)]">
      <ProjectShareModal
        isOpen={isShareModalOpen}
        onClose={closeShareModal}
        owner={projectOwner}
        collaborators={collaborators}
        viewerRole={viewerRole}
        inviteValue={inviteValue}
        onInviteValueChange={setInviteValue}
        onInviteSubmit={handleInviteSubmit}
        inviteError={inviteError}
        isInviteSubmitting={isInviteSubmitting}
        isLoading={isLoadingCollaborators}
        canInvite={canManageShareLink}
        onRemoveCollaborator={handleRemoveCollaborator}
        removeError={removeError}
        shareUrl={shareUrl}
        isShareUrlLoading={isShareUrlLoading}
        shareUrlError={shareUrlError}
        canManageShareLink={canManageShareLink}
        onCopyShareUrl={handleCopyShareLink}
        onResetShareUrl={rotateShareUrl}
      />
      <header className="border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
        <div className="flex h-10 items-center gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/ide"
              data-testid="back-to-workspaces"
              onClick={handleBackToWorkspaces}
              className={clsx(chromeButtonClass, 'gap-1.5 px-2')}
              aria-label="Back to workspaces"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-[11px]">Workspaces</span>
            </Link>
            <div className="flex min-w-0 items-center gap-2 text-[12px]">
              <span className="text-[var(--ide-text-faint)]">{config.title}</span>
              <span className="text-[var(--ide-text-faint)]">/</span>
            {isRenamingProject ? (
              <input
                data-testid="project-name-input"
                ref={projectNameInputRef}
                value={projectNameDraft}
                onChange={event => setProjectNameDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitProjectRename();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelProjectRename();
                  }
                }}
                onBlur={commitProjectRename}
                autoFocus
                placeholder={isNameRequired ? 'Name your project' : 'Project name'}
                className="w-[180px] border border-[var(--ide-border-strong)] bg-[var(--ide-bg-panel)] px-2 py-1 text-[12px] text-[var(--ide-text)] placeholder:text-[var(--ide-text-faint)] outline-none focus:border-[var(--ide-accent)]"
              />
            ) : (
              <button
                data-testid="project-title"
                onClick={viewerRole === 'owner' ? beginProjectRename : undefined}
                className="truncate text-[12px] text-[var(--ide-text-muted)] transition hover:text-[var(--ide-text)]"
              >
                {projectMeta.name?.trim() || defaultProjectName}
              </button>
            )}
              <span className="text-[var(--ide-text-faint)]">/</span>
              <span className="truncate text-[12px] text-[var(--ide-text)]">{activePath}</span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span data-testid="save-status" className={statusBadgeClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {savedLabel}
            </span>
            {orderedLiveCollaborators.length ? (
              <PresenceAvatars collaborators={orderedLiveCollaborators} />
            ) : null}
            {cloudError ? <span className="text-[11px] text-[#f2b8ae]">{cloudError}</span> : null}
            <button
              type="button"
              onClick={() => setShowExplorer(previous => !previous)}
              className={clsx(chromeButtonClass, showExplorer && activeChromeButtonClass)}
            >
              Explorer
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(previous => !previous)}
              className={clsx(chromeButtonClass, showPreview && activeChromeButtonClass)}
            >
              Preview
            </button>
            <button
              data-testid="share-button"
              onClick={openShareModal}
              className={shareButtonClass}
              disabled={shareButtonDisabled}
              title={
                shareButtonDisabled
                  ? 'Save this project to enable sharing'
                  : viewerRole === 'owner'
                    ? 'Invite collaborators'
                    : 'View collaborators'
              }
            >
              Share
            </button>
          </div>
        </div>
      </header>
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {showExplorer ? (
          <aside className="flex min-h-0 w-[248px] shrink-0 border-r border-[var(--ide-border)]">
            <FileExplorer
              files={files}
              activePath={activePath}
              onSelect={activatePath}
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={createSmartFile}
              onResetWorkspace={resetWorkspace}
              canReset={viewerRole === 'owner'}
              newlyCreatedPath={recentlyCreatedPath}
              onFeedback={pushToast}
              placeholder={config.newFilePlaceholder}
              readOnly={!canEdit}
            />
          </aside>
        ) : null}

        <section
          className={clsx(
            'flex min-w-0 flex-1 min-h-0 flex-col bg-[var(--ide-bg-editor)]',
            showPreview && 'border-r border-[var(--ide-border)]'
          )}
        >
          <div className="custom-scrollbar flex h-9 items-stretch overflow-x-auto border-b border-[var(--ide-border)] bg-[var(--ide-bg-elevated)]">
            {visibleTabs.map(path => {
              const isActive = path === activePath;

              return (
                <div
                  key={path}
                  data-testid={`editor-tab-${path}`}
                  data-state={isActive ? 'active' : 'inactive'}
                  className={clsx(
                    'group flex min-w-[160px] max-w-[240px] items-center border-r border-[var(--ide-border)]',
                    isActive
                      ? 'bg-[var(--ide-bg-editor)] text-[var(--ide-text)]'
                      : 'bg-[var(--ide-bg-tab)] text-[var(--ide-text-muted)] hover:bg-[var(--ide-bg-hover)]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => activatePath(path)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 text-left text-[12px]"
                  >
                    <span className="truncate">{path}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => closeTab(path)}
                    disabled={visibleTabs.length === 1}
                    className="mr-1 inline-flex h-6 w-6 items-center justify-center text-[var(--ide-text-faint)] transition hover:bg-[var(--ide-bg-hover)] hover:text-[var(--ide-text)] disabled:opacity-0"
                    aria-label={`Close ${path}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex min-h-0 flex-1 bg-[var(--ide-bg-editor)]">
            <Editor
              value={code}
              language={lang}
              onChange={setActiveCode}
              onCursorChange={(line, column) => {
                setCursorLine(line);
                setCursorColumn(column);
              }}
              readOnly={!canEdit}
              path={activePath}
            />
          </div>
        </section>

        {showPreview ? (
          <aside className="flex min-h-0 w-[min(40vw,34rem)] shrink-0 bg-[var(--ide-bg-panel)]">
            <Preview
              key={previewRefreshKey}
              files={sandpackFiles}
              activePath={`/${activePath}`}
              template={config.previewTemplate}
              mode={config.previewMode}
              disabledMessage={config.previewMessage}
              activeFileCode={code}
              activeFileLanguage={lang}
              onRefresh={() => setPreviewRefreshKey(key => key + 1)}
            />
          </aside>
        ) : null}
      </main>
      <StatusBar language={lang} cursorLine={cursorLine} cursorColumn={cursorColumn} />
      {toast ? (
        <div className="pointer-events-none fixed bottom-4 right-4 flex justify-end">
          <div
            className={`pointer-events-auto inline-flex items-center gap-3 border px-3 py-2 text-[12px] shadow-lg ${
              toast.kind === 'success'
                ? 'border-[var(--ide-border-strong)] bg-[var(--ide-bg-panel)] text-[var(--ide-text)]'
                : 'border-[var(--ide-danger)]/50 bg-[var(--ide-danger)]/12 text-[#f2b8ae]'
            }`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center border border-current text-[10px] font-semibold uppercase tracking-[0.12em]">
              {toast.kind === 'success' ? 'OK' : 'ERR'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <CollaborativeEditor
      projectId={collaborationKey}
      files={files}
      onFilesChange={handleCollaborativeFilesChange}
      encodedState={encodedYjsState}
      onSnapshotChange={handleSnapshotChange}
      localPresence={localCollaboratorPresence}
      onPresenceChange={setLiveCollaborators}
      onRemoteMutation={markRemoteMutation}
    >
      {content}
    </CollaborativeEditor>
  );
}
