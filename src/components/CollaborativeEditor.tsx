'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { Awareness } from 'y-protocols/awareness';

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
  ymap: Y.Map<ProjectFile>;
  observer: (event: Y.YMapEvent<ProjectFile>) => void;
  provider: WebrtcProvider | null;
  awareness: Awareness | null;
  sendPresence: (presence: LocalCollaboratorPresence | null) => void;
  disposeAwarenessListener: (() => void) | null;
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
  const onPresenceChangeRef = useRef<((presence: CollaboratorPresence[]) => void) | undefined>(undefined);
  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange ?? undefined;
  }, [onPresenceChange]);

  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    const collaboration = collaborationRef.current;
    if (!collaboration) {
      return;
    }
    collaboration.sendPresence(localPresenceRef.current);
  }, [localPresence]);

  useEffect(() => {
    if (!projectId) {
      if (collaborationRef.current) {
        const current = collaborationRef.current;
        current.ymap.unobserve(current.observer);
        current.disposeAwarenessListener?.();
        current.awareness?.setLocalState(null);
        current.provider?.destroy();
        current.ydoc.destroy();
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
        Y.applyUpdate(ydoc, decoded, 'bootstrap');
        appliedStateRef.current = encodedState ?? null;
      } catch (error) {
        console.error('Failed to apply stored Yjs state', error);
      }
    }

    if (ymap.size === 0) {
      ydoc.transact(
        () => {
          Object.values(files).forEach(file => {
            ymap.set(file.path, cloneProjectFile(file));
          });
        },
        'bootstrap',
      );
    } else {
      const existing = projectFilesFromYMap(ymap);
      suppressLocalSyncRef.current = true;
      onFilesChange(existing);
      Promise.resolve().then(() => {
        suppressLocalSyncRef.current = false;
      });
    }

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

    const collaboration: CollaborationRef = {
      ydoc,
      ymap,
      observer,
      provider: null,
      awareness: null,
      sendPresence: () => {},
      disposeAwarenessListener: null,
    };

    let provider: WebrtcProvider | null = null;
    let awareness: Awareness | null = null;

    if (typeof window !== 'undefined') {
      try {
        provider = new WebrtcProvider(`yentic-project-${projectId}`, ydoc, {
          signaling: [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com',
          ],
          maxConns: 20,
          filterBcConns: false,
          peerOpts: {
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
              ],
            },
          },
        });
        awareness = provider.awareness;
      } catch (error) {
        console.error('Failed to initialize WebRTC collaboration provider', error);
      }
    }

    const fallbackColor = '#38bdf8';

    const emitPresenceSnapshot = () => {
      if (!awareness) {
        onPresenceChangeRef.current?.([]);
        return;
      }
      const states = awareness.getStates();
      const normalized: CollaboratorPresence[] = [];
      states.forEach((state, clientId) => {
        if (!state || typeof state !== 'object') {
          return;
        }
        const presenceEntry = (state as { presence?: LocalCollaboratorPresence | null }).presence;
        if (!presenceEntry || typeof presenceEntry !== 'object') {
          return;
        }
        if (typeof presenceEntry.id !== 'string' || presenceEntry.id.trim().length === 0) {
          return;
        }
        normalized.push({
          clientId: String(clientId),
          userId: presenceEntry.id,
          name:
            typeof presenceEntry.name === 'string' && presenceEntry.name.trim().length > 0
              ? presenceEntry.name
              : null,
          color:
            typeof presenceEntry.color === 'string' && presenceEntry.color.trim().length > 0
              ? presenceEntry.color
              : fallbackColor,
          avatar:
            typeof presenceEntry.avatar === 'string' && presenceEntry.avatar.length > 0
              ? presenceEntry.avatar
              : null,
          isSelf: awareness ? clientId === awareness.clientID : false,
        });
      });
      onPresenceChangeRef.current?.(normalized);
    };

    if (awareness) {
      awareness.on('update', emitPresenceSnapshot);
      emitPresenceSnapshot();
      collaboration.disposeAwarenessListener = () => {
        awareness?.off('update', emitPresenceSnapshot);
      };
    }

    collaboration.provider = provider;
    collaboration.awareness = awareness;
    collaboration.sendPresence = presence => {
      if (!collaboration.awareness) {
        return;
      }
      if (!presence) {
        collaboration.awareness.setLocalState(null);
        return;
      }
      collaboration.awareness.setLocalStateField('presence', {
        id: presence.id,
        name: presence.name ?? null,
        color: presence.color,
        avatar: presence.avatar ?? null,
      });
    };

    collaborationRef.current = collaboration;
    collaboration.sendPresence(localPresenceRef.current);

    if (isMounted) {
      onDoc?.(ydoc);
    }

    return () => {
      ymap.unobserve(observer);
      collaboration.disposeAwarenessListener?.();
      collaboration.disposeAwarenessListener = null;
      if (awareness) {
        awareness.setLocalState(null);
      }
      provider?.destroy();
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
        Y.applyUpdate(collaboration.ydoc, decoded, 'bootstrap');
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
