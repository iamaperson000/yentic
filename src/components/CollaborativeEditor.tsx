'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';
import type { CollaboratorPresence, LocalCollaboratorPresence } from '@/types/collaboration';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type CollaborativeEditorProps = {
  projectId: string | null;
  files: ProjectFileMap;
  onFilesChange: (files: ProjectFileMap) => void;
  encodedState?: string | null;
  onSnapshotChange?: (snapshot: string | null) => void;
  localPresence?: LocalCollaboratorPresence | null;
  onPresenceChange?: (presence: CollaboratorPresence[]) => void;
  onRemoteMutation?: () => void;
  children?: ReactNode;
};

type CollaborationMessage =
  | { type: 'update'; update: string; clientId?: string }
  | {
      type: 'presence';
      clients: Array<{
        clientId: string;
        userId: string | null;
        name: string | null;
        color: string | null;
        avatar: string | null;
      }>;
    };

type ProjectOperation =
  | { type: 'set-file'; file: ProjectFile }
  | { type: 'remove-file'; path: string };

type OperationEnvelope = {
  kind: 'op';
  opId: string;
  version: number | null;
  op: ProjectOperation;
};

type SnapshotEnvelope = {
  kind: 'snapshot';
  version: number;
  files: ProjectFile[];
};

type CollaborationEnvelope = OperationEnvelope | SnapshotEnvelope;

type PostOptions = {
  keepalive?: boolean;
  preferBeacon?: boolean;
  allowDuringDispose?: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function generateClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function base64Encode(input: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64Decode(encoded: string): string | null {
  try {
    if (typeof window === 'undefined') {
      return Buffer.from(encoded, 'base64').toString('utf-8');
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (error) {
    console.error('[CollaborativeEditor] Failed to decode snapshot payload:', error);
    return null;
  }
}

function sanitizeProjectFile(raw: unknown): ProjectFile | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { path, language, code } = raw as Partial<ProjectFile> & {
    path?: unknown;
    language?: unknown;
    code?: unknown;
  };

  if (typeof path !== 'string' || path.trim().length === 0) {
    return null;
  }
  const normalizedPath = path.trim().slice(0, 260);

  const normalizedLanguage: ProjectFile['language'] =
    typeof language === 'string' && ['html', 'css', 'javascript', 'python', 'c', 'cpp', 'java'].includes(language.trim())
      ? (language.trim() as ProjectFile['language'])
      : inferLanguage(normalizedPath);

  const normalizedCode = typeof code === 'string' ? code : '';
  return { path: normalizedPath, language: normalizedLanguage, code: normalizedCode };
}

function cloneProjectFile(file: ProjectFile): ProjectFile {
  return { path: file.path, language: file.language, code: file.code };
}

function sanitizeProjectMap(map: ProjectFileMap): ProjectFileMap {
  const result: ProjectFileMap = {};
  Object.values(map).forEach(file => {
    const sanitized = sanitizeProjectFile(file);
    if (sanitized) {
      result[sanitized.path] = cloneProjectFile(sanitized);
    }
  });
  return result;
}

function deserializeCollaborationEnvelope(serialized: string): CollaborationEnvelope | null {
  try {
    const parsed = JSON.parse(serialized) as CollaborationEnvelope;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if ((parsed as { kind?: unknown }).kind === 'snapshot') {
      const { files, version } = parsed as SnapshotEnvelope;
      if (!Array.isArray(files) || typeof version !== 'number' || !Number.isFinite(version)) {
        return null;
      }
      const sanitized = files
        .map(file => sanitizeProjectFile(file))
        .filter((file): file is ProjectFile => Boolean(file));
      return { kind: 'snapshot', version, files: sanitized };
    }
    const { op, opId } = parsed as OperationEnvelope;
    if (!op || typeof op !== 'object' || typeof opId !== 'string' || opId.length === 0) {
      return null;
    }
    if ((op as { type?: unknown }).type === 'set-file') {
      const sanitized = sanitizeProjectFile((op as { file?: unknown }).file);
      if (!sanitized) {
        return null;
      }
      return {
        kind: 'op',
        opId,
        version: typeof (parsed as { version?: unknown }).version === 'number'
          ? (parsed as { version: number }).version
          : null,
        op: { type: 'set-file', file: sanitized },
      };
    }
    if ((op as { type?: unknown }).type === 'remove-file') {
      const path = (op as { path?: unknown }).path;
      if (typeof path !== 'string' || path.trim().length === 0) {
        return null;
      }
      return {
        kind: 'op',
        opId,
        version: typeof (parsed as { version?: unknown }).version === 'number'
          ? (parsed as { version: number }).version
          : null,
        op: { type: 'remove-file', path: path.trim() },
      };
    }
  } catch (error) {
    console.error('[CollaborativeEditor] Failed to parse collaboration envelope:', error);
    return null;
  }
  return null;
}

function encodeSnapshotFromMap(map: ProjectFileMap): string {
  const serialized = JSON.stringify(
    Object.values(map)
      .map(file => sanitizeProjectFile(file))
      .filter((file): file is ProjectFile => Boolean(file))
      .map(file => cloneProjectFile(file))
  );
  return base64Encode(serialized);
}

function decodeSnapshotToMap(encoded: string): ProjectFileMap | null {
  const decoded = base64Decode(encoded);
  if (!decoded) {
    return null;
  }
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const out: ProjectFileMap = {};
    parsed.forEach(entry => {
      const sanitized = sanitizeProjectFile(entry);
      if (sanitized) {
        out[sanitized.path] = cloneProjectFile(sanitized);
      }
    });
    return out;
  } catch (error) {
    console.error('[CollaborativeEditor] Failed to parse decoded snapshot:', error);
    return null;
  }
}

function colorForClient(clientId: string): string {
  let hash = 0;
  for (let index = 0; index < clientId.length; index += 1) {
    hash = (hash << 5) - hash + clientId.charCodeAt(index);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 65% 60%)`;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

export default function CollaborativeEditor({
  projectId,
  files,
  onFilesChange,
  encodedState,
  onSnapshotChange,
  localPresence,
  onPresenceChange,
  onRemoteMutation,
  children,
}: CollaborativeEditorProps) {
  const clientIdRef = useRef<string>(generateClientId());
  const filesRef = useRef<ProjectFileMap>({});
  const versionRef = useRef<number>(0);
  const seenOperationsRef = useRef<Set<string>>(new Set());
  const hasShareableStateRef = useRef(false);
  const suppressLocalSyncRef = useRef(false);
  const pendingLocalUpdateRef = useRef<{ serialized: string; options?: PostOptions } | null>(null);
  const sendUpdateRef = useRef<(serialized: string, options?: PostOptions) => void>((serialized, options) => {
    pendingLocalUpdateRef.current = { serialized, options };
  });
  const sendPresenceRef = useRef<(() => void) | null>(null);
  const connectedRef = useRef(false);
  const knownPeersRef = useRef<Set<string>>(new Set());
  const localPresenceRef = useRef<LocalCollaboratorPresence | null>(null);
  const onPresenceChangeRef = useRef<typeof onPresenceChange>(undefined);
  const onRemoteMutationRef = useRef<typeof onRemoteMutation>(undefined);
  const disposeRef = useRef<(() => void) | null>(null);
  const snapshotRef = useRef<string | null>(null);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange;
  }, [onPresenceChange]);

  useEffect(() => {
    onRemoteMutationRef.current = onRemoteMutation;
  }, [onRemoteMutation]);

  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    if (localPresence && sendPresenceRef.current) {
      sendPresenceRef.current();
    }
  }, [localPresence]);

  const emitPresence = useCallback(
    (message: CollaborationMessage) => {
      if (message.type !== 'presence') {
        return;
      }
      const localId = localPresenceRef.current?.id ?? null;
      const derived: CollaboratorPresence[] = message.clients
        .filter(entry => typeof entry.userId === 'string' && entry.userId.length > 0)
        .map(entry => ({
          clientId: `sse:${entry.clientId}`,
          userId: entry.userId ?? entry.clientId,
          name: entry.name ?? null,
          color: entry.color ?? colorForClient(entry.clientId),
          avatar: entry.avatar ?? null,
          isSelf: Boolean(localId && entry.userId === localId),
        }));
      onPresenceChangeRef.current?.(derived);
    },
    [],
  );

  const applySnapshot = useCallback(
    (snapshot: ProjectFileMap, version: number) => {
      versionRef.current = Math.max(versionRef.current, version);
      filesRef.current = snapshot;
      hasShareableStateRef.current = true;
      const encoded = encodeSnapshotFromMap(snapshot);
      onSnapshotChange?.(encoded);
      snapshotRef.current = JSON.stringify({
        kind: 'snapshot' as const,
        version: versionRef.current,
        files: Object.values(snapshot).map(file => cloneProjectFile(file)),
      });
      suppressLocalSyncRef.current = true;
      onFilesChange(snapshot);
      queueMicrotask(() => {
        suppressLocalSyncRef.current = false;
      });
    },
    [onFilesChange, onSnapshotChange],
  );

  const applyOperation = useCallback(
    (operation: ProjectOperation) => {
      const next: ProjectFileMap = { ...filesRef.current };
      if (operation.type === 'set-file') {
        next[operation.file.path] = cloneProjectFile(operation.file);
      } else {
        delete next[operation.path];
      }
      filesRef.current = next;
      hasShareableStateRef.current = true;
      const encoded = encodeSnapshotFromMap(next);
      onSnapshotChange?.(encoded);
      snapshotRef.current = JSON.stringify({
        kind: 'snapshot' as const,
        version: versionRef.current,
        files: Object.values(next).map(file => cloneProjectFile(file)),
      });
      suppressLocalSyncRef.current = true;
      onFilesChange(next);
      queueMicrotask(() => {
        suppressLocalSyncRef.current = false;
      });
    },
    [onFilesChange, onSnapshotChange],
  );

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') {
      disposeRef.current?.();
      disposeRef.current = null;
      filesRef.current = {};
      versionRef.current = 0;
      seenOperationsRef.current = new Set();
      pendingLocalUpdateRef.current = null;
      sendUpdateRef.current = (serialized, options) => {
        pendingLocalUpdateRef.current = { serialized, options };
      };
      sendPresenceRef.current = null;
      snapshotRef.current = null;
      return;
    }

    const endpoint = `/api/projects/${projectId}/collaboration`;
    let eventSource: EventSource | null = null;
    let disposed = false;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let presenceInterval: number | null = null;
    const pendingRequests: Array<{ body: string; keepalive: boolean; attempt: number; allowDuringDispose?: boolean }> = [];
    let sendingRequest = false;

    const processPendingRequests = () => {
      if (sendingRequest || pendingRequests.length === 0) {
        return;
      }
      const next = pendingRequests.shift();
      if (!next) {
        return;
      }
      sendingRequest = true;
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: next.body,
        keepalive: next.keepalive,
      })
        .then(() => {
          sendingRequest = false;
          processPendingRequests();
        })
        .catch(error => {
          console.error('[CollaborativeEditor] Failed to post collaboration payload:', error);
          sendingRequest = false;
          if (!disposed && typeof window !== 'undefined' && next.attempt < 3) {
            const delay = Math.min(600 * 2 ** next.attempt, 5000);
            window.setTimeout(() => {
              pendingRequests.unshift({
                body: next.body,
                keepalive: next.keepalive,
                attempt: next.attempt + 1,
                allowDuringDispose: next.allowDuringDispose,
              });
              processPendingRequests();
            }, delay);
          }
          processPendingRequests();
        });
    };

    const postCollaboration = (
      payload: { type: 'update'; update: string } | { type: 'presence'; presence: unknown },
      options?: PostOptions,
    ) => {
      if (disposed && !options?.allowDuringDispose) {
        return;
      }
      const bodyObject =
        payload.type === 'update'
          ? { type: 'update', update: payload.update, clientId: clientIdRef.current }
          : { type: 'presence', presence: payload.presence, clientId: clientIdRef.current };
      const body = JSON.stringify(bodyObject);

      if (payload.type === 'presence' && options?.preferBeacon && typeof navigator !== 'undefined') {
        try {
          if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) {
            return;
          }
        } catch (error) {
          console.error('[CollaborativeEditor] Failed to send beacon payload:', error);
        }
      }

      pendingRequests.push({
        body,
        keepalive: options?.keepalive ?? payload.type === 'presence',
        attempt: 0,
        allowDuringDispose: options?.allowDuringDispose,
      });
      processPendingRequests();
    };

    let pendingBroadcast: { serialized: string; options?: PostOptions } | null = null;
    let broadcastTimer: number | null = null;

    const flushPendingBroadcast = (override?: { serialized?: string; options?: PostOptions }) => {
      const candidate =
        override && typeof override.serialized === 'string'
          ? { serialized: override.serialized, options: override.options }
          : pendingBroadcast;
      if (!candidate) {
        return;
      }
      pendingBroadcast = null;
      if (broadcastTimer !== null) {
        window.clearTimeout(broadcastTimer);
        broadcastTimer = null;
      }
      postCollaboration({ type: 'update', update: candidate.serialized }, candidate.options);
    };

    const scheduleBroadcast = (serialized: string, options?: PostOptions) => {
      pendingBroadcast = { serialized, options };
      if (options?.keepalive) {
        flushPendingBroadcast({ serialized, options });
        return;
      }
      if (broadcastTimer !== null) {
        return;
      }
      broadcastTimer = window.setTimeout(() => {
        broadcastTimer = null;
        const candidate = pendingBroadcast;
        pendingBroadcast = null;
        if (!candidate) {
          return;
        }
        postCollaboration({ type: 'update', update: candidate.serialized }, candidate.options);
      }, 120);
    };

    sendUpdateRef.current = (serialized, options) => {
      scheduleBroadcast(serialized, options);
    };

    if (pendingLocalUpdateRef.current) {
      const { serialized, options } = pendingLocalUpdateRef.current;
      pendingLocalUpdateRef.current = null;
      scheduleBroadcast(serialized, options);
    }

    const buildPresencePayload = () => {
      const presence = localPresenceRef.current;
      if (!presence) {
        return null;
      }
      return {
        id: presence.id,
        name: presence.name ?? null,
        color: presence.color || colorForClient(clientIdRef.current),
        avatar: presence.avatar ?? null,
      };
    };

    const sendPresence = (presence: unknown, options?: PostOptions) => {
      postCollaboration({ type: 'presence', presence }, options);
    };

    sendPresenceRef.current = () => {
      const payload = buildPresencePayload();
      if (payload) {
        sendPresence(payload, { keepalive: true });
      }
    };

    const handlePageHide = () => {
      if (snapshotRef.current) {
        flushPendingBroadcast({
          serialized: snapshotRef.current,
          options: {
            keepalive: true,
            preferBeacon: true,
            allowDuringDispose: true,
          },
        });
      }
      sendPresence(null, { keepalive: true, preferBeacon: true, allowDuringDispose: true });
    };

    window.addEventListener('pagehide', handlePageHide);

    const broadcastSnapshot = (options?: PostOptions, immediate = false) => {
      if (!hasShareableStateRef.current || !snapshotRef.current) {
        return;
      }
      if (immediate) {
        flushPendingBroadcast({ serialized: snapshotRef.current, options });
        return;
      }
      scheduleBroadcast(snapshotRef.current, options);
    };

    const handleUpdateEnvelope = (message: { update: string; clientId?: string }) => {
      if (!message.update) {
        return;
      }
      if (message.clientId && message.clientId === clientIdRef.current) {
        return;
      }
      const payload = deserializeCollaborationEnvelope(message.update);
      if (!payload) {
        return;
      }
      if (payload.kind === 'snapshot') {
        const snapshotMap = payload.files.reduce<ProjectFileMap>((acc, file) => {
          acc[file.path] = cloneProjectFile(file);
          return acc;
        }, {});
        applySnapshot(snapshotMap, payload.version);
        onRemoteMutationRef.current?.();
        return;
      }
      if (seenOperationsRef.current.has(payload.opId)) {
        return;
      }
      seenOperationsRef.current.add(payload.opId);
      if (typeof payload.version === 'number' && Number.isFinite(payload.version)) {
        versionRef.current = Math.max(versionRef.current, payload.version);
      } else {
        versionRef.current += 1;
      }
      applyOperation(payload.op);
      onRemoteMutationRef.current?.();
    };

    const openEventStream = () => {
      if (eventSource) {
        eventSource.close();
      }

      connectedRef.current = false;
      knownPeersRef.current = new Set();

      try {
        eventSource = new EventSource(`${endpoint}?clientId=${encodeURIComponent(clientIdRef.current)}`);
      } catch (error) {
        console.error('[CollaborativeEditor] Failed to initialize collaboration stream:', error);
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        connectedRef.current = true;
        broadcastSnapshot(undefined, true);
        const payload = buildPresencePayload();
        if (payload) {
          sendPresence(payload);
        }
        if (presenceInterval !== null) {
          window.clearInterval(presenceInterval);
        }
        presenceInterval = window.setInterval(() => {
          const latest = buildPresencePayload();
          if (latest) {
            sendPresence(latest);
          }
        }, 20000);
      };

      eventSource.onmessage = event => {
        if (!event.data) {
          return;
        }
        let parsed: CollaborationMessage;
        try {
          parsed = JSON.parse(event.data) as CollaborationMessage;
        } catch (error) {
          console.error('[CollaborativeEditor] Failed to parse SSE payload:', error);
          return;
        }

        if (parsed.type === 'update') {
          handleUpdateEnvelope(parsed);
          return;
        }

        const uniqueIds = new Set<string>();
        const remoteIds = new Set<string>();
        parsed.clients.forEach(client => {
          if (typeof client.clientId === 'string') {
            uniqueIds.add(client.clientId);
            if (client.clientId !== clientIdRef.current) {
              remoteIds.add(client.clientId);
            }
          }
        });

        const previous = knownPeersRef.current;
        const newPeers: string[] = [];
        remoteIds.forEach(id => {
          if (!previous.has(id)) {
            newPeers.push(id);
          }
        });
        knownPeersRef.current = remoteIds;
        emitPresence(parsed);
        if (newPeers.length > 0 && connectedRef.current && hasShareableStateRef.current) {
          broadcastSnapshot();
        }
      };

      eventSource.onerror = error => {
        console.error('[CollaborativeEditor] Collaboration stream error:', error);
        connectedRef.current = false;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (presenceInterval !== null) {
          window.clearInterval(presenceInterval);
          presenceInterval = null;
        }
        if (disposed) {
          return;
        }
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
        }
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 12000);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          openEventStream();
        }, delay);
      };
    };

    openEventStream();

    const dispose = () => {
      disposed = true;
      connectedRef.current = false;
      if (presenceInterval !== null) {
        window.clearInterval(presenceInterval);
      }
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (broadcastTimer !== null) {
        window.clearTimeout(broadcastTimer);
        broadcastTimer = null;
      }
      pendingBroadcast = null;
      window.removeEventListener('pagehide', handlePageHide);
      knownPeersRef.current = new Set();
      sendPresence(null, { keepalive: true, preferBeacon: true, allowDuringDispose: true });
    };

    disposeRef.current = dispose;

    return dispose;
  }, [applyOperation, applySnapshot, emitPresence, onSnapshotChange, projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    const sanitized = sanitizeProjectMap(files);
    if (suppressLocalSyncRef.current) {
      filesRef.current = sanitized;
      const encoded = encodeSnapshotFromMap(sanitized);
      onSnapshotChange?.(encoded);
      snapshotRef.current = JSON.stringify({
        kind: 'snapshot' as const,
        version: versionRef.current,
        files: Object.values(sanitized).map(file => cloneProjectFile(file)),
      });
      return;
    }

    const previous = filesRef.current;
    let hasChanges = false;

    Object.values(sanitized).forEach(file => {
      const prev = previous[file.path];
      if (!prev || prev.language !== file.language || prev.code !== file.code) {
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      for (const path of Object.keys(previous)) {
        if (!sanitized[path]) {
          hasChanges = true;
          break;
        }
      }
    }

    filesRef.current = sanitized;
    if (Object.keys(sanitized).length > 0) {
      hasShareableStateRef.current = true;
    }
    const encoded = encodeSnapshotFromMap(sanitized);
    onSnapshotChange?.(encoded);

    if (hasChanges) {
      versionRef.current += 1;
    }

    snapshotRef.current = JSON.stringify({
      kind: 'snapshot' as const,
      version: versionRef.current,
      files: Object.values(sanitized).map(file => cloneProjectFile(file)),
    });

    if (hasChanges) {
      sendUpdateRef.current(snapshotRef.current);
    }
  }, [files, onSnapshotChange, projectId]);

  useEffect(() => {
    if (!projectId || !encodedState) {
      return;
    }
    const decoded = decodeSnapshotToMap(encodedState);
    if (!decoded) {
      return;
    }
    filesRef.current = decoded;
    hasShareableStateRef.current = true;
    const encodedSnapshot = encodeSnapshotFromMap(decoded);
    onSnapshotChange?.(encodedSnapshot);
    snapshotRef.current = JSON.stringify({
      kind: 'snapshot' as const,
      version: versionRef.current,
      files: Object.values(decoded).map(file => cloneProjectFile(file)),
    });
    suppressLocalSyncRef.current = true;
    onFilesChange(decoded);
    queueMicrotask(() => {
      suppressLocalSyncRef.current = false;
    });
  }, [encodedState, onFilesChange, onSnapshotChange, projectId]);

  useEffect(() => {
    return () => {
      disposeRef.current?.();
      disposeRef.current = null;
      pendingLocalUpdateRef.current = null;
      sendUpdateRef.current = (serialized, options) => {
        pendingLocalUpdateRef.current = { serialized, options };
      };
      sendPresenceRef.current = null;
    };
  }, []);

  const sandpackFiles = useMemo(() => {
    const out: Record<string, { code: string }> = {};
    Object.values(files).forEach(file => {
      out[`/${file.path}`] = { code: file.code };
    });
    return out;
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
