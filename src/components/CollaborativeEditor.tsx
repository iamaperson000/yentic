'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';

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

type CollaborationCommand =
  | { type: 'update'; update: string }
  | {
      type: 'presence';
      presence:
        | {
            id: string;
            name: string | null;
            color: string;
            avatar: string | null;
          }
        | null;
    };

type ServerPresenceEntry = {
  clientId: string;
  userId: string | null;
  name: string | null;
  color: string | null;
  avatar: string | null;
};

type CollaborationServerMessage =
  | { type: 'update'; update: string; clientId: string }
  | { type: 'presence'; clients: ServerPresenceEntry[] };

type CollaborationRef = {
  ydoc: Y.Doc;
  ymap: Y.Map<ProjectFile>;
  observer: (event: Y.YMapEvent<ProjectFile>) => void;
  eventSource: EventSource;
  updateHandler: (update: Uint8Array, origin: unknown) => void;
  pendingUpdates: Uint8Array[];
  flushTimeoutId: number | null;
  sendCommand: (command: CollaborationCommand) => void;
  sendPresence: (presence: LocalCollaboratorPresence | null) => void;
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

function encodeUpdate(update: Uint8Array): string {
  if (typeof window === 'undefined') {
    return Buffer.from(update).toString('base64');
  }
  let binary = '';
  update.forEach(value => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function createCommandSender(projectId: string, clientId: string) {
  const url = `/api/projects/${projectId}/collaboration`;
  return (command: CollaborationCommand) => {
    const payload = JSON.stringify({ ...command, clientId });
    if (command.type === 'update' && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) {
          return;
        }
      } catch {
        // ignore and fall back to fetch
      }
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: command.type === 'update',
    }).catch(error => {
      console.error('Collaboration command failed', error);
    });
  };
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
  const clientIdRef = useRef<string>('');

  if (!clientIdRef.current) {
    clientIdRef.current =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

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
        current.ydoc.off('update', current.updateHandler);
        if (current.flushTimeoutId !== null) {
          window.clearTimeout(current.flushTimeoutId);
        }
        current.eventSource.close();
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

    const clientId = clientIdRef.current;
    const sendCommand = createCommandSender(projectId, clientId);

    const collaboration: CollaborationRef = {
      ydoc,
      ymap,
      observer,
      eventSource: new EventSource(
        `/api/projects/${projectId}/collaboration/stream?clientId=${encodeURIComponent(clientId)}`,
      ),
      updateHandler: () => {},
      pendingUpdates: [],
      flushTimeoutId: null,
      sendCommand,
      sendPresence: () => {},
    };

    const flushUpdates = () => {
      if (!collaboration.pendingUpdates.length) {
        return;
      }
      const updates = collaboration.pendingUpdates.splice(0);
      const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates);
      collaboration.sendCommand({ type: 'update', update: encodeUpdate(merged) });
    };

    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'bootstrap') {
        return;
      }
      collaboration.pendingUpdates.push(update);
      if (collaboration.flushTimeoutId !== null) {
        return;
      }
      collaboration.flushTimeoutId = window.setTimeout(() => {
        collaboration.flushTimeoutId = null;
        flushUpdates();
      }, 40);
    };

    collaboration.updateHandler = updateHandler;
    ydoc.on('update', updateHandler);

    const eventSource = collaboration.eventSource;

    const handleMessage = (event: MessageEvent<string>) => {
      if (!event.data) {
        return;
      }
      let payload: CollaborationServerMessage;
      try {
        payload = JSON.parse(event.data) as CollaborationServerMessage;
      } catch (error) {
        console.error('Failed to parse collaboration message', error);
        return;
      }
      if (payload.type === 'update') {
        if (payload.clientId === clientId) {
          return;
        }
        const updateBytes = decodeState(payload.update);
        if (!updateBytes) {
          return;
        }
        try {
          Y.applyUpdate(ydoc, updateBytes, 'remote');
        } catch (error) {
          console.error('Failed to apply remote collaboration update', error);
        }
      } else if (payload.type === 'presence') {
        const fallbackColor = '#38bdf8';
        const normalized: CollaboratorPresence[] = [];
        payload.clients.forEach(entry => {
          if (!entry || typeof entry !== 'object') {
            return;
          }
          if (typeof entry.userId !== 'string' || entry.userId.length === 0) {
            return;
          }
          normalized.push({
            clientId: entry.clientId,
            userId: entry.userId,
            name: entry.name ?? null,
            color:
              typeof entry.color === 'string' && entry.color.trim().length > 0
                ? entry.color
                : fallbackColor,
            avatar:
              typeof entry.avatar === 'string' && entry.avatar.length > 0
                ? entry.avatar
                : null,
            isSelf: entry.clientId === clientId,
          });
        });
        onPresenceChangeRef.current?.(normalized);
      }
    };

    const handleOpen = () => {
      collaboration.sendPresence(localPresenceRef.current);
    };

    const handleError = () => {
      console.warn('Collaboration stream disconnected, retrying…');
    };

    eventSource.addEventListener('message', handleMessage);
    eventSource.addEventListener('open', handleOpen);
    eventSource.addEventListener('error', handleError);

    collaboration.sendPresence = presence => {
      if (!presence) {
        collaboration.sendCommand({ type: 'presence', presence: null });
        return;
      }
      collaboration.sendCommand({
        type: 'presence',
        presence: {
          id: presence.id,
          name: presence.name ?? null,
          color: presence.color,
          avatar: presence.avatar ?? null,
        },
      });
    };

    collaborationRef.current = collaboration;
    collaboration.sendPresence(localPresenceRef.current);

    if (isMounted) {
      onDoc?.(ydoc);
    }

    return () => {
      if (collaboration.flushTimeoutId !== null) {
        window.clearTimeout(collaboration.flushTimeoutId);
      }
      flushUpdates();
      ymap.unobserve(observer);
      ydoc.off('update', updateHandler);
      eventSource.removeEventListener('message', handleMessage);
      eventSource.removeEventListener('open', handleOpen);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
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
