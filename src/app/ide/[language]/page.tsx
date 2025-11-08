'use client';

import Link from 'next/link';
import { notFound, useSearchParams } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';

import { Editor } from '@/components/Editor';
import { FileExplorer } from '@/components/FileExplorer';
import { Preview } from '@/components/Preview';
import CollaborativeEditor from '@/components/CollaborativeEditor';
import { ProjectShareModal } from '@/components/ProjectShareModal';
import { type CollaboratorInfo, type ViewerRole } from '@/types/collaboration';
import {
  clearProject,
  ensureUniquePath,
  getStarterProject,
  inferLanguage,
  loadProject,
  resolveWorkspaceSlugFromLanguage,
  saveProject,
  scaffoldFor,
  type ProjectFileMap,
  type SupportedLanguage,
  type WorkspaceSlug,
  workspaceConfigs
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

function encodeYjsUpdate(update: Uint8Array): string {
  if (typeof window === 'undefined') {
    return Buffer.from(update).toString('base64');
  }
  let binary = '';
  update.forEach(value => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

type WorkspacePageProps = {
  params: Promise<{ language: string }>;
};

type CloudProject = {
  id: string;
  name: string;
  language: string;
  files: ProjectFileMap;
  updatedAt: string;
  yjsState?: string | null;
  viewerRole?: ViewerRole;
};

type ProjectMeta = {
  id: string | null;
  name: string;
};

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { language } = use(params);
  const slug = language as WorkspaceSlug;
  const workspace = workspaceConfigs[slug];

  if (!workspace) {
    notFound();
  }

  const config = workspace;

  const [files, setFilesState] = useState<ProjectFileMap>(() => getStarterProject(slug));
  const [activePath, setActivePath] = useState<string>(config.defaultActivePath);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [recentlyCreatedPath, setRecentlyCreatedPath] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const metaStorageKey = `yentic.project.meta:${slug}`;
  const defaultProjectName = `${config.title} project`;
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(() => {
    if (typeof window === 'undefined') {
      return { id: null, name: defaultProjectName };
    }
    try {
      const raw = window.localStorage.getItem(metaStorageKey);
      if (!raw) {
        return { id: null, name: defaultProjectName };
      }
      const parsed = JSON.parse(raw) as Partial<ProjectMeta>;
      const storedName = typeof parsed.name === 'string' && parsed.name.trim()
        ? parsed.name.trim()
        : defaultProjectName;
      return { id: parsed.id ?? null, name: storedName };
    } catch {
      return { id: null, name: defaultProjectName };
    }
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
  const searchParams = useSearchParams();
  const [viewerRole, setViewerRole] = useState<ViewerRole>('owner');
  const [encodedYjsState, setEncodedYjsState] = useState<string | null>(null);
  const collaborativeDocRef = useRef<Y.Doc | null>(null);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [inviteValue, setInviteValue] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [projectOwner, setProjectOwner] = useState<CollaboratorInfo | null>(null);

  const updateFiles = useCallback(
    (updater: ProjectFileMap | ((prev: ProjectFileMap) => ProjectFileMap)) => {
      setFilesState(prev =>
        typeof updater === 'function' ? (updater as (prev: ProjectFileMap) => ProjectFileMap)(prev) : (updater as ProjectFileMap)
      );
    },
    []
  );

  const handleCollaborativeFilesChange = useCallback(
    (next: ProjectFileMap) => {
      autoSaveSkipRef.current = true;
      setFilesState(() => next);
      saveProject(slug, next);
      if (!next[activePath]) {
        const fallback = next[config.defaultActivePath]
          ? config.defaultActivePath
          : Object.keys(next).sort((a, b) => a.localeCompare(b))[0] ?? config.defaultActivePath;
        setActivePath(fallback);
      }
    },
    [activePath, config.defaultActivePath, slug]
  );

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
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(metaStorageKey, JSON.stringify(projectMeta));
  }, [metaStorageKey, projectMeta]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem(metaStorageKey);
      if (!raw) {
        setProjectMeta({ id: null, name: defaultProjectName });
        setCloudAuthRequired(false);
        setCloudError(null);
        setIsNameRequired(false);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<ProjectMeta>;
      setProjectMeta({
        id: parsed.id ?? null,
        name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : defaultProjectName,
      });
      setCloudAuthRequired(false);
      setCloudError(null);
      setIsNameRequired(false);
    } catch {
      setProjectMeta({ id: null, name: defaultProjectName });
      setCloudAuthRequired(false);
      setCloudError(null);
      setIsNameRequired(false);
    }
  }, [metaStorageKey, defaultProjectName]);

  useEffect(() => {
    autoSaveSkipRef.current = true;
    const stored = loadProject(slug);
    if (stored && Object.keys(stored).length) {
      updateFiles(stored);
      const preferred = stored[config.defaultActivePath]
        ? config.defaultActivePath
        : Object.keys(stored).sort((a, b) => a.localeCompare(b))[0];
      setActivePath(preferred);
    } else {
      const starter = getStarterProject(slug);
      updateFiles(starter);
      setActivePath(config.defaultActivePath);
    }
    setEncodedYjsState(null);
    setViewerRole('owner');
    setCollaborators([]);
    setProjectOwner(null);
  }, [slug, config.defaultActivePath, updateFiles]);

  useEffect(() => {
    const intent = searchParams?.get('new');
    if (intent !== '1') {
      return;
    }

    if (typeof window !== 'undefined') {
      clearProject(slug);
      window.localStorage.removeItem(metaStorageKey);
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState(null, '', url.toString());
    }

    namePromptInitializedRef.current = false;
    autoSaveSkipRef.current = true;
    const starter = getStarterProject(slug);
    updateFiles(starter);
    setActivePath(config.defaultActivePath);
    setProjectMeta({ id: null, name: defaultProjectName });
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
    cloudWarningShownRef.current = false;
    loadedCloudProjectIdRef.current = null;
  }, [
    config.defaultActivePath,
    defaultProjectName,
    metaStorageKey,
    searchParams,
    slug,
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

      if (!error && renamed && activePath === oldPath) {
        setActivePath(nextPath);
      }

      return error;
    },
    [activePath, updateFiles]
  );

  const onDelete = useCallback((path: string) => {
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

    if (shouldUpdateActive) {
      setActivePath(nextActivePath);
    }
  }, [activePath, slug, config.defaultActivePath, updateFiles]);

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
      saveProject(slug, project.files);
      updateFiles(project.files);
      const firstPath = Object.keys(project.files).sort()[0] || config.defaultActivePath;
      setActivePath(firstPath);
      const normalizedName = project.name.trim() || defaultProjectName;
      setProjectMeta({ id: project.id, name: normalizedName });
      setIsNameRequired(false);
      setLastSavedAt(new Date(project.updatedAt ?? Date.now()));
      setCloudAuthRequired(false);
      setCloudError(null);
      setViewerRole(project.viewerRole ?? 'owner');
      setEncodedYjsState(project.yjsState ?? null);
      if (!options?.silent) {
        pushToast({ kind: 'success', message: `✅ Loaded project: ${normalizedName}` });
      }
    },
    [config.defaultActivePath, defaultProjectName, pushToast, slug, updateFiles]
  );

  const persistProject = useCallback(
    async (context: 'auto' | 'manual' | 'rename') => {
      if (!files || !Object.keys(files).length) {
        return { ok: false as const, reason: 'empty' as const };
      }

      const normalizedName = projectMeta.name.trim() || defaultProjectName;
      if (normalizedName !== projectMeta.name) {
        setProjectMeta(prev => ({ ...prev, name: normalizedName }));
      }

      saveProject(slug, files);

      const doc = collaborativeDocRef.current;
      let yStateBase64: string | null = null;
      if (doc) {
        try {
          const update = Y.encodeStateAsUpdate(doc);
          yStateBase64 = encodeYjsUpdate(update);
        } catch (error) {
          console.error('Failed to encode collaborative state', error);
        }
      } else if (encodedYjsState) {
        yStateBase64 = encodedYjsState;
      }

      setIsSaving(true);
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: projectMeta.id ?? undefined,
            name: normalizedName,
            language: slug,
            files,
            yjsState: yStateBase64,
          }),
        });

        if (res.status === 401) {
          setCloudAuthRequired(true);
          setCloudError('Sign in to sync projects.');
          if (!cloudWarningShownRef.current) {
            cloudWarningShownRef.current = true;
            pushToast({ kind: 'error', message: '❌ Sign in to sync projects to the cloud.' });
          }
          return { ok: false as const, reason: 'unauthorized' as const };
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
            pushToast({ kind: 'error', message: `❌ Save failed: ${message}` });
          }
          return { ok: false as const, reason: 'error' as const, message };
        }

        const project = (await res.json()) as CloudProject;
        const syncedName = project.name.trim() || normalizedName;
        setProjectMeta({ id: project.id, name: syncedName });
        setLastSavedAt(new Date(project.updatedAt ?? Date.now()));
        setCloudAuthRequired(false);
        setCloudError(null);
        cloudWarningShownRef.current = false;
        setIsNameRequired(false);
        setViewerRole(project.viewerRole ?? (projectMeta.id ? viewerRole : 'owner'));
        setEncodedYjsState(project.yjsState ?? null);
        return { ok: true as const, project };
      } catch (error) {
        console.error('Save failed:', error);
        setCloudError('Network error');
        if (context !== 'auto') {
          pushToast({ kind: 'error', message: '❌ Save failed: network or auth issue' });
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
      viewerRole,
    ]
  );

  useEffect(() => {
    if (!files || !Object.keys(files).length) return;
    if (autoSaveSkipRef.current) {
      autoSaveSkipRef.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      void persistProject('auto');
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [files, persistProject, projectMeta.name]);

  const handleSave = useCallback(async () => {
    const result = await persistProject('manual');
    if (result.ok) {
      pushToast({ kind: 'success', message: `✅ Project synced to the cloud` });
    }
  }, [persistProject, pushToast]);

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

  const openShareModal = useCallback(() => {
    if (!projectMeta.id) {
      return;
    }
    setShareModalOpen(true);
    setInviteValue('');
    setInviteError(null);
    setRemoveError(null);
    void loadCollaborators();
  }, [loadCollaborators, projectMeta.id]);

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
    setInviteValue('');
    setInviteError(null);
    setRemoveError(null);
    setIsInviteSubmitting(false);
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
        if (prev.some(entry => entry.id === data.collaborator.id)) {
          return prev;
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
        setCollaborators(prev => prev.filter(entry => entry.id !== userId));
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
    setProjectMeta(prev => ({ ...prev, name: trimmed }));
    setIsRenamingProject(false);
    setIsNameRequired(false);
    pushToast({
      kind: 'success',
      message: isNameRequired ? `Project named ${trimmed}` : `Renamed project to ${trimmed}`,
    });
  }, [isNameRequired, projectNameDraft, projectMeta.name, pushToast, viewerRole]);

  useEffect(() => {
    const projectId = searchParams?.get('projectId');
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
            pushToast({ kind: 'error', message: '❌ Sign in to load cloud projects.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        if (res.status === 404) {
          if (!cancelled) {
            pushToast({ kind: 'error', message: '❌ Project not found or inaccessible.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            pushToast({ kind: 'error', message: '❌ Failed to load project from cloud.' });
            loadedCloudProjectIdRef.current = null;
          }
          return;
        }
        const project = (await res.json()) as CloudProject;
        const targetSlug = resolveWorkspaceSlugFromLanguage(project.language, slug);
        if (targetSlug !== slug) {
          if (!cancelled) {
            pushToast({ kind: 'error', message: '❌ Project belongs to a different workspace.' });
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
          pushToast({ kind: 'error', message: '❌ Failed to load project from cloud.' });
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
  }, [applyCloudProject, pushToast, searchParams, slug]);

  const sandpackFiles = useMemo(() => {
    const map: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => {
      map[`/${f.path}`] = { code: f.code };
    });
    return map;
  }, [files]);

  const formattedTime = formatTime(lastSavedAt);
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

  const statusBadgeClass = cloudAuthRequired
    ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-100'
    : cloudError
      ? 'inline-flex items-center gap-1.5 rounded-full border border-rose-400/60 bg-rose-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-100'
      : isSaving || isLoadingCloudProject
        ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-100'
        : 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-100';

  const actionButtonBaseClass =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-60';
  const primaryActionClass =
    `${actionButtonBaseClass} bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400`;
  const subtleActionClass =
    `${actionButtonBaseClass} border border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10 hover:text-white`;
  const dangerActionClass =
    `${actionButtonBaseClass} border border-rose-400/40 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20 hover:text-rose-50`;
  const shareButtonClass =
    viewerRole === 'owner'
      ? subtleActionClass
      : `${actionButtonBaseClass} border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white`;
  const shareButtonDisabled = !projectMeta.id;

  const createSmartFile = useCallback(() => {
    const activeFile = files[activePath];
    const activeLanguage = activeFile?.language;
    const placeholder = smartPlaceholder(config.newFilePlaceholder, activeLanguage);
    const createdPath = onCreate(placeholder);
    setRecentlyCreatedPath(createdPath);
    pushToast({ kind: 'success', message: `Created file ${createdPath}` });
  }, [files, activePath, config.newFilePlaceholder, onCreate, pushToast]);

  const resetWorkspace = useCallback(() => {
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
    saveProject(slug, starter);
    setLastSavedAt(new Date());
    setIsSaving(false);
    setCloudError(null);
  }, [slug, config.defaultActivePath, updateFiles]);

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

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#06070d] via-[#090b19] to-[#040509] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="relative flex min-h-screen flex-col">
        <CollaborativeEditor
          projectId={projectMeta.id}
          files={files}
          onFilesChange={handleCollaborativeFilesChange}
          encodedState={encodedYjsState}
          onDoc={doc => {
            collaborativeDocRef.current = doc;
          }}
        >
          {null}
        </CollaborativeEditor>
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
          canInvite={viewerRole === 'owner' && !shareButtonDisabled}
          onRemoveCollaborator={handleRemoveCollaborator}
          removeError={removeError}
        />
        <header className="border-b border-white/10 bg-black/30 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[13px] font-semibold text-white/75 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
                  <path
                    d="M11.75 5.75 8 9.5l3.75 3.75"
                    className="fill-none stroke-current stroke-[1.5]"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Workspace</p>
                <p className="truncate text-sm font-semibold text-white sm:text-base">{config.title}</p>
              </div>
              <p className="hidden min-w-0 truncate text-xs text-white/50 sm:block">{config.description}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-white/60">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Project</span>
                {isRenamingProject ? (
                  <input
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
                    className="w-[180px] rounded-md border border-white/20 bg-black/60 px-2.5 py-1 text-sm text-white placeholder:text-white/40 focus:border-emerald-300/60 focus:outline-none focus:ring-1 focus:ring-emerald-300/40"
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={beginProjectRename}
                    onClick={beginProjectRename}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        beginProjectRename();
                      }
                    }}
                    className="truncate max-w-[220px] rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-medium text-white/75 transition hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300/60"
                    title="Double-click to rename project"
                  >
                    {projectMeta.name}
                  </button>
                )}
              </div>
              <span className={statusBadgeClass}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {savedLabel}
              </span>
              {cloudError ? <span className="text-[11px] text-rose-200">{cloudError}</span> : null}
              <div className="flex items-center gap-1.5">
                <button onClick={createSmartFile} className={primaryActionClass}>
                  New file
                </button>
                <button
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
                <button onClick={handleSave} className={subtleActionClass}>
                  Sync now
                </button>
                <button onClick={resetWorkspace} className={dangerActionClass}>
                  Reset workspace
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col px-4 pb-6 pt-4 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1440px] flex-1 gap-3 md:gap-4 lg:grid-cols-[200px_minmax(0,2fr)_minmax(0,1.05fr)] xl:grid-cols-[220px_minmax(0,2.1fr)_minmax(0,1.05fr)]">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="flex flex-1 flex-col overflow-hidden">
                <FileExplorer
                  files={files}
                  activePath={activePath}
                  onSelect={setActivePath}
                  onRename={onRename}
                  onDelete={onDelete}
                  onCreateFile={createSmartFile}
                  newlyCreatedPath={recentlyCreatedPath}
                  onFeedback={pushToast}
                  placeholder={config.newFilePlaceholder}
                />
              </div>
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40">
              <Editor value={code} language={lang} onChange={setActiveCode} />
            </div>
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/40">
              <Preview
                files={sandpackFiles}
                activePath={`/${activePath}`}
                template={config.previewTemplate}
                mode={config.previewMode}
                disabledMessage={config.previewMessage}
                activeFileCode={code}
                activeFileLanguage={lang}
              />
            </div>
          </div>
        </main>

        {toast ? (
          <div className="pointer-events-none fixed inset-x-0 top-6 flex justify-center px-4">
            <div
              className={`pointer-events-auto inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur ${
                toast.kind === 'success'
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                  : 'border-rose-400/50 bg-rose-500/15 text-rose-100'
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] font-semibold uppercase tracking-[0.2em]">
                {toast.kind === 'success' ? 'OK' : 'ERR'}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}