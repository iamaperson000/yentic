'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';
import type {
  CollaboratorPresence,
  LocalCollaboratorPresence,
} from '@/types/collaboration';

type CollaborativeEditorProps = {
  projectId: string | null;
  files: ProjectFileMap;
  onFilesChange: (files: ProjectFileMap) => void;
  encodedState?: string | null;
  onDoc?: (doc: Y.Doc | null) => void;
  localPresence?: LocalCollaboratorPresence | null;
  onPresenceChange?: (presence: CollaboratorPresence[]) => void;
  children?: ReactNode;
};

type CollaborationRef = {
  ydoc: Y.Doc;
  provider: WebrtcProvider;
  ymap: Y.Map<ProjectFile>;
  observer: (event: Y.YMapEvent<ProjectFile>) => void;
  awarenessHandler: () => void;
};

function cloneProjectFile(file: ProjectFile): ProjectFile {
  return {
    path: file.path,
    language: file.language,
    code: file.code,
  };
}

function normalizeProjectFile(path: string, file: Partial<ProjectFile>): ProjectFile {
  const fromFile = typeof file.path === 'string' ? file.path.trim() : '';
  const fromKey = path.trim();
  const normalizedPath = fromFile || fromKey || path;
  const language = file.language ?? inferLanguage(normalizedPath);
  const code = typeof file.code === 'string' ? file.code : '';
  return {
    path: normalizedPath,
    language,
    code,
  };
}

function isLegacyProjectFileMap(value: unknown): value is Record<string, Partial<ProjectFile>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  if ('path' in (value as Record<string, unknown>)) {
    return false;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) {
    return false;
  }
  return entries.every(([, entry]) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }
    return 'code' in (entry as Record<string, unknown>);
  });
}

function projectFilesFromYMap(map: Y.Map<ProjectFile>): ProjectFileMap {
  const result: ProjectFileMap = {};
  map.forEach((value, key) => {
    if (!value) {
      return;
    }
    if (isLegacyProjectFileMap(value)) {
      const legacyEntries = value as Record<string, Partial<ProjectFile>>;
      Object.entries(legacyEntries).forEach(([legacyPath, legacyFile]) => {
        const normalized = normalizeProjectFile(legacyPath, legacyFile ?? {});
        result[normalized.path] = cloneProjectFile(normalized);
      });
      return;
    }
    const normalizedPath = typeof value.path === 'string' && value.path.length > 0 ? value.path : key;
    result[normalizedPath] = cloneProjectFile({
      path: normalizedPath,
      language: value.language,
      code: value.code,
    });
  });
  return result;
}

function decodeState(encoded?: string | null): Uint8Array | null {
  if (!encoded) {
    return null;
  }

  try {
    if (typeof window === 'undefined') {
      return Uint8Array.from(Buffer.from(encoded, 'base64'));
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('Failed to decode Yjs state', error);
    return null;
  }
}

export default function CollaborativeEditor({
  projectId,
  files,
  onFilesChange,
  encodedState,
  onDoc,
  localPresence,
  onPresenceChange,
  children,
}: CollaborativeEditorProps) {
  const collaborationRef = useRef<CollaborationRef | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const appliedStateRef = useRef<string | null>(null);
  const localPresenceRef = useRef<LocalCollaboratorPresence | null>(null);
  const onPresenceChangeRef = useRef<((presence: CollaboratorPresence[]) => void) | undefined>();

  const emitPresence = useCallback(() => {
    const collaboration = collaborationRef.current;
    if (!collaboration) {
      return;
    }
    const { provider } = collaboration;
    const awareness = provider.awareness;
    const localClientId = awareness.clientID;
    const entries = Array.from(awareness.getStates().entries());
    const normalized: CollaboratorPresence[] = [];

    entries.forEach(([clientId, state]) => {
      if (!state || typeof state !== 'object') {
        return;
      }
      const userState = (state as { user?: unknown }).user;
      if (!userState || typeof userState !== 'object') {
        return;
      }
      const { id, name, color, avatar } = userState as {
        id?: unknown;
        name?: unknown;
        color?: unknown;
        avatar?: unknown;
      };
      if (typeof id !== 'string' || !id) {
        return;
      }
      const fallbackColor = '#38bdf8';
      normalized.push({
        clientId,
        userId: id,
        name: typeof name === 'string' ? name : null,
        color:
          typeof color === 'string' && color.trim().length > 0 ? color : fallbackColor,
        avatar: typeof avatar === 'string' && avatar.length > 0 ? avatar : null,
        isSelf: clientId === localClientId,
      });
    });

    onPresenceChangeRef.current?.(normalized);
  }, []);

  const applyLocalPresence = useCallback((provider: WebrtcProvider, presence: LocalCollaboratorPresence | null) => {
    if (presence) {
      provider.awareness.setLocalStateField('user', {
        id: presence.id,
        name: presence.name ?? null,
        color: presence.color,
        avatar: presence.avatar ?? null,
      });
    } else {
      provider.awareness.setLocalStateField('user', undefined);
    }
  }, []);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange ?? undefined;
  }, [onPresenceChange]);

  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    const collaboration = collaborationRef.current;
    if (!collaboration) {
      return;
    }
    applyLocalPresence(collaboration.provider, localPresenceRef.current);
    emitPresence();
  }, [applyLocalPresence, emitPresence, localPresence]);

  useEffect(() => {
    if (!projectId) {
      if (collaborationRef.current) {
        collaborationRef.current.ymap.unobserve(collaborationRef.current.observer);
        collaborationRef.current.provider.awareness.off(
          'update',
          collaborationRef.current.awarenessHandler,
        );
        collaborationRef.current.provider.destroy();
        collaborationRef.current.ydoc.destroy();
        collaborationRef.current = null;
      }
      appliedStateRef.current = null;
      onDoc?.(null);
      onPresenceChangeRef.current?.([]);
      return;
    }

    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap<ProjectFile>('files');
    let isMounted = true;

    const decoded = encodedState ? decodeState(encodedState) : null;
    if (decoded) {
      try {
        Y.applyUpdate(ydoc, decoded);
        appliedStateRef.current = encodedState ?? null;
      } catch (error) {
        console.error('Failed to apply stored Yjs state', error);
      }
    }

    if (ymap.size === 0) {
      ydoc.transact(() => {
        Object.values(files).forEach(file => {
          ymap.set(file.path, cloneProjectFile(file));
        });
      });
    } else {
      const existing = projectFilesFromYMap(ymap);
      suppressLocalSyncRef.current = true;
      onFilesChange(existing);
      Promise.resolve().then(() => {
        suppressLocalSyncRef.current = false;
      });
    }

    const provider = new WebrtcProvider(`project-${projectId}`, ydoc);

    const observer = (event: Y.YMapEvent<ProjectFile>) => {
      if (event.transaction.local || suppressLocalSyncRef.current) {
        return;
      }
      const current = projectFilesFromYMap(event.target);
      suppressLocalSyncRef.current = true;
      onFilesChange(current);
      Promise.resolve().then(() => {
        suppressLocalSyncRef.current = false;
      });
    };

    ymap.observe(observer);
    const awarenessHandler = () => {
      emitPresence();
    };

    provider.awareness.on('update', awarenessHandler);
    applyLocalPresence(provider, localPresenceRef.current);
    collaborationRef.current = { ydoc, provider, ymap, observer, awarenessHandler };
    if (isMounted) {
      onDoc?.(ydoc);
    }
    emitPresence();

    return () => {
      ymap.unobserve(observer);
      provider.awareness.off('update', awarenessHandler);
      provider.destroy();
      ydoc.destroy();
      collaborationRef.current = null;
      appliedStateRef.current = null;
      onDoc?.(null);
      onPresenceChangeRef.current?.([]);
      isMounted = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    const collaboration = collaborationRef.current;
    if (!collaboration || suppressLocalSyncRef.current) {
      return;
    }
    const { ydoc, ymap } = collaboration;
    const existing = new Map<string, ProjectFile>();
    ymap.forEach((value, key) => {
      if (value) {
        existing.set(key, value);
      }
    });

    const pendingDeletes: string[] = [];
    const pendingUpserts: ProjectFile[] = [];

    Object.values(files).forEach(file => {
      const prev = existing.get(file.path);
      if (
        !prev ||
        prev.path !== file.path ||
        prev.language !== file.language ||
        prev.code !== file.code
      ) {
        pendingUpserts.push(file);
      }
      existing.delete(file.path);
    });

    existing.forEach((_, key) => {
      pendingDeletes.push(key);
    });

    if (!pendingUpserts.length && !pendingDeletes.length) {
      return;
    }

    suppressLocalSyncRef.current = true;
    ydoc.transact(() => {
      pendingUpserts.forEach(file => {
        ymap.set(file.path, cloneProjectFile(file));
      });
      pendingDeletes.forEach(key => {
        ymap.delete(key);
      });
    });
    Promise.resolve().then(() => {
      suppressLocalSyncRef.current = false;
    });
  }, [files, projectId]);

  useEffect(() => {
    if (!projectId || !encodedState) {
      return;
    }
    if (appliedStateRef.current === encodedState) {
      return;
    }
    const collaboration = collaborationRef.current;
    if (!collaboration) {
      return;
    }
    const decoded = decodeState(encodedState);
    if (!decoded) {
      appliedStateRef.current = encodedState;
      return;
    }
    try {
      collaboration.ydoc.transact(() => {
        Y.applyUpdate(collaboration.ydoc, decoded);
      });
      appliedStateRef.current = encodedState;
    } catch (error) {
      console.error('Failed to apply collaborative state update', error);
    }
  }, [encodedState, projectId]);

  const sandpackFiles = useMemo(() => {
    const result: Record<string, { code: string }> = {};
    Object.values(files).forEach(file => {
      result[`/${file.path}`] = { code: file.code };
    });
    return result;
  }, [files]);

  if (children !== undefined) {
    return <>{children}</>;
  }

  return (
    <div className="h-full">
      <Sandpack files={sandpackFiles} template="react" options={{ autorun: true }} />
    </div>
  );
}
