'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';
import type { CollaboratorPresence, LocalCollaboratorPresence } from '@/types/collaboration';

type CollaborativeEditorProps = {
  projectId: string | null;
  files: ProjectFileMap;
  onFilesChange: (files: ProjectFileMap) => void;
  encodedState?: string | null;
  onDoc?: (doc: Y.Doc | null) => void;
  localPresence?: LocalCollaboratorPresence | null;
  onPresenceChange?: (presence: CollaboratorPresence[]) => void;
  projectName?: string | null;
  onRemoteProjectName?: (name: string | null) => void;
  children?: ReactNode;
};

type CollaborationRef = {
  ydoc: Y.Doc;
  ymap: Y.Map<ProjectFile>;
  unobserveFiles: (() => void) | null;
  sendPresence: (presence: LocalCollaboratorPresence | null) => void;
  closeSse?: () => void;
  updateProjectName?: () => void;
};

type ServerPresenceEntry = {
  clientId: string;
  userId: string | null;
  name: string | null;
  color: string | null;
  avatar: string | null;
};

type CollaborationServerMessage =
  | { type: 'update'; update: string; clientId?: string }
  | { type: 'presence'; clients: ServerPresenceEntry[] }
  | { type: 'meta'; name: string | null };

type CollaborationPayload =
  | { type: 'update'; update: string }
  | { type: 'presence'; presence: LocalCollaboratorPresence | null }
  | { type: 'meta'; meta: { name: string | null } };

function cloneProjectFile(file: ProjectFile): ProjectFile {
  return { path: file.path, language: file.language, code: file.code };
}

function normalizeProjectFile(path: string, file: Partial<ProjectFile>): ProjectFile {
  const normalizedPath = file.path?.trim() || path.trim() || path;
  const language = file.language ?? inferLanguage(normalizedPath);
  const code = typeof file.code === 'string' ? file.code : '';
  return { path: normalizedPath, language, code };
}

function isLegacyProjectFileMap(v: unknown): v is Record<string, Partial<ProjectFile>> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if ('path' in (v as Record<string, unknown>)) return false;
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return false;
  return entries.every(([, entry]) => !!entry && typeof entry === 'object' && 'code' in (entry as any));
}

function projectFilesFromYMap(map: Y.Map<ProjectFile>): ProjectFileMap {
  const result: ProjectFileMap = {};
  map.forEach((value, key) => {
    if (!value) return;
    if (isLegacyProjectFileMap(value)) {
      Object.entries(value).forEach(([legacyPath, legacyFile]) => {
        const maybeFile =
          typeof legacyFile === 'object' && legacyFile !== null ? (legacyFile as Partial<ProjectFile>) : {};
        const normalized = normalizeProjectFile(legacyPath, maybeFile);
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

function decodeStateBase64(encoded?: string | null): Uint8Array | null {
  if (!encoded) return null;
  try {
    if (typeof window === 'undefined') {
      return Uint8Array.from(Buffer.from(encoded, 'base64'));
    }
    const bin = atob(encoded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    console.error('[Yjs] Failed to decode snapshot:', e);
    return null;
  }
}

function generateClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
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

export default function CollaborativeEditor({
  projectId,
  files,
  onFilesChange,
  encodedState,
  onDoc,
  localPresence,
  onPresenceChange,
  projectName,
  onRemoteProjectName,
  children,
}: CollaborativeEditorProps) {
  const collabRef = useRef<CollaborationRef | null>(null);
  const appliedSnapshotRef = useRef<string | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const localPresenceRef = useRef<LocalCollaboratorPresence | null>(null);
  const onPresenceChangeRef = useRef<((p: CollaboratorPresence[]) => void) | undefined>(undefined);
  const presenceStateRef = useRef<CollaboratorPresence[]>([]);
  const knownSseClientsRef = useRef<Set<string>>(new Set());
  const hasBroadcastableStateRef = useRef(false);
  const onRemoteProjectNameRef = useRef<((name: string | null) => void) | undefined>(undefined);
  const projectNameRef = useRef<string | null>(projectName ?? null);
  const lastRemoteProjectNameRef = useRef<string | null>(null);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange ?? undefined;
    if (presenceStateRef.current.length) {
      onPresenceChangeRef.current?.(presenceStateRef.current);
    }
  }, [onPresenceChange]);

  useEffect(() => {
    onRemoteProjectNameRef.current = onRemoteProjectName ?? undefined;
  }, [onRemoteProjectName]);

  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    collabRef.current?.sendPresence(localPresenceRef.current);
  }, [localPresence]);

  useEffect(() => {
    projectNameRef.current = typeof projectName === 'string' ? projectName : projectName ?? null;
    if (!projectId) {
      lastRemoteProjectNameRef.current = null;
      return;
    }
    collabRef.current?.updateProjectName?.();
  }, [projectName, projectId]);

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') {
      if (collabRef.current) {
        try {
          collabRef.current.unobserveFiles?.();
          collabRef.current.closeSse?.();
        } catch {}
        collabRef.current = null;
      }
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      presenceStateRef.current = [];
      knownSseClientsRef.current = new Set();
      hasBroadcastableStateRef.current = false;
      onPresenceChangeRef.current?.([]);
      return;
    }

    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap<ProjectFile>('files');
    hasBroadcastableStateRef.current = false;

    if (encodedState && !appliedSnapshotRef.current) {
      const decoded = decodeStateBase64(encodedState);
      if (decoded) {
        try {
          Y.applyUpdate(ydoc, decoded, 'bootstrap');
          appliedSnapshotRef.current = encodedState;
          hasBroadcastableStateRef.current = true;
          console.log('[Yjs] Applied bootstrap snapshot');
        } catch (e) {
          console.error('[Yjs] Failed to apply snapshot:', e);
        }
      } else {
        appliedSnapshotRef.current = encodedState;
      }
    }

    if (ymap.size === 0) {
      ydoc.transact(() => {
        Object.values(files).forEach(f => ymap.set(f.path, cloneProjectFile(f)));
      }, 'seed-from-props');
      hasBroadcastableStateRef.current = true;
    } else {
      const existing = projectFilesFromYMap(ymap);
      suppressLocalSyncRef.current = true;
      onFilesChange(existing);
      queueMicrotask(() => (suppressLocalSyncRef.current = false));
    }

    const onFilesChanged = (evt: Y.YMapEvent<ProjectFile>) => {
      if (evt.transaction.local || suppressLocalSyncRef.current) return;
      const next = projectFilesFromYMap(evt.target);
      suppressLocalSyncRef.current = true;
      onFilesChange(next);
      queueMicrotask(() => (suppressLocalSyncRef.current = false));
    };
    ymap.observe(onFilesChanged);

    const clientId = generateClientId();
    let disposed = false;
    let eventSource: EventSource | null = null;
    let updateQueue: Uint8Array[] = [];
    let updateTimer: number | null = null;
    let presenceInterval: number | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let sendingRequest = false;
    const pendingRequests: Array<{ body: string; keepalive: boolean; attempt: number }> = [];
    let sseConnected = false;
    let pendingProjectName: string | null = projectNameRef.current ?? null;
    let lastSentProjectName: string | null = null;

    type PostOptions = {
      keepalive?: boolean;
      preferBeacon?: boolean;
      allowDuringDispose?: boolean;
    };

    const endpoint = `/api/projects/${projectId}/collaboration`;

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
          console.error('[Yjs] Failed to post collaboration payload:', error);
          sendingRequest = false;
          if (!disposed && typeof window !== 'undefined' && next.attempt < 3) {
            const delay = Math.min(500 * 2 ** next.attempt, 4000);
            window.setTimeout(() => {
              pendingRequests.unshift({
                body: next.body,
                keepalive: next.keepalive,
                attempt: next.attempt + 1,
              });
              processPendingRequests();
            }, delay);
          }
          processPendingRequests();
        });
    };

    const postCollaboration = (payload: CollaborationPayload, options?: PostOptions) => {
      if (disposed && !options?.allowDuringDispose) {
        return;
      }
      const bodyObject =
        payload.type === 'update'
          ? { type: 'update', update: payload.update, clientId }
          : payload.type === 'presence'
            ? { type: 'presence', presence: payload.presence ?? null, clientId }
            : { type: 'meta', meta: payload.meta, clientId };
      const body = JSON.stringify(bodyObject);

      if (payload.type === 'presence' && options?.preferBeacon && typeof navigator !== 'undefined') {
        try {
          if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) {
            return;
          }
        } catch (error) {
          console.error('[Yjs] Failed to send beacon payload:', error);
        }
      }

      pendingRequests.push({
        body,
        keepalive: options?.keepalive ?? payload.type === 'presence',
        attempt: 0,
      });
      processPendingRequests();
    };

    const clearUpdateTimer = () => {
      if (updateTimer !== null) {
        window.clearTimeout(updateTimer);
        updateTimer = null;
      }
    };

    const clearPresenceInterval = () => {
      if (presenceInterval !== null) {
        window.clearInterval(presenceInterval);
        presenceInterval = null;
      }
    };

    const flushQueuedUpdates = (options?: { allowDuringDispose?: boolean }) => {
      clearUpdateTimer();
      if (!updateQueue.length) {
        return;
      }
      if (!sseConnected && !options?.allowDuringDispose) {
        updateTimer = window.setTimeout(() => {
          flushQueuedUpdates(options);
        }, 150);
        return;
      }
      try {
        const merged = Y.mergeUpdates(updateQueue);
        updateQueue = [];
        const encoded = encodeYjsUpdate(merged);
        if (encoded) {
          postCollaboration(
            { type: 'update', update: encoded },
            options?.allowDuringDispose ? { allowDuringDispose: true, keepalive: true } : undefined,
          );
        }
      } catch (error) {
        console.error('[Yjs] Failed to merge queued updates:', error);
        updateQueue = [];
      }
    };

    const enqueueUpdateForSse = (update: Uint8Array) => {
      updateQueue.push(update);
      if (updateTimer !== null) {
        return;
      }
      updateTimer = window.setTimeout(() => {
        flushQueuedUpdates();
      }, 120);
    };

    const handlePageHide = () => {
      flushQueuedUpdates({ allowDuringDispose: true });
      postCollaboration(
        { type: 'presence', presence: null },
        { keepalive: true, preferBeacon: true, allowDuringDispose: true },
      );
    };

    window.addEventListener('pagehide', handlePageHide);

    const sendPresencePayload = (
      presence: LocalCollaboratorPresence | null,
      options?: PostOptions,
    ) => {
      postCollaboration({ type: 'presence', presence }, options);
    };

    const tryBroadcastProjectName = (name: string | null, options?: { force?: boolean }) => {
      const normalized = typeof name === 'string' && name.length > 0 ? name : null;
      pendingProjectName = normalized;
      if (!options?.force && normalized === lastSentProjectName) {
        return;
      }
      if (!options?.force && normalized === lastRemoteProjectNameRef.current) {
        lastSentProjectName = normalized;
        pendingProjectName = null;
        return;
      }
      if (!sseConnected) {
        return;
      }
      postCollaboration({ type: 'meta', meta: { name: normalized } });
      lastSentProjectName = normalized;
      pendingProjectName = null;
    };

    const openEventStream = () => {
      if (eventSource) {
        eventSource.close();
      }

      sseConnected = false;
      clearPresenceInterval();

      try {
        eventSource = new EventSource(`${endpoint}?clientId=${encodeURIComponent(clientId)}`);
      } catch (error) {
        console.error('[Yjs] Failed to initialize collaboration stream:', error);
        if (typeof window !== 'undefined') {
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            openEventStream();
          }, delay);
        }
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        sseConnected = true;
        if (reconnectTimer !== null && typeof window !== 'undefined') {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        flushQueuedUpdates();
        const presence = localPresenceRef.current;
        if (presence) {
          sendPresencePayload(presence);
        }
        tryBroadcastProjectName(projectNameRef.current ?? pendingProjectName, { force: true });
        clearPresenceInterval();
        presenceInterval = window.setInterval(() => {
          const latestPresence = localPresenceRef.current;
          if (latestPresence) {
            sendPresencePayload(latestPresence);
          }
        }, 20000);
      };

      eventSource.onmessage = event => {
        if (!event.data) {
          return;
        }
        try {
          const message = JSON.parse(event.data) as CollaborationServerMessage;
          if (message.type === 'update') {
            if (!message.update || message.clientId === clientId) {
              return;
            }
            const decoded = decodeStateBase64(message.update);
            if (!decoded) {
              return;
            }
            try {
              Y.applyUpdate(ydoc, decoded, 'collab-sse');
              hasBroadcastableStateRef.current = true;
            } catch (error) {
              console.error('[Yjs] Failed to apply collaboration update:', error);
            }
            return;
          }

          if (message.type === 'meta') {
            const remoteName = typeof message.name === 'string' ? message.name : null;
            lastRemoteProjectNameRef.current = remoteName;
            pendingProjectName = null;
            if (remoteName !== lastSentProjectName) {
              projectNameRef.current = remoteName;
              onRemoteProjectNameRef.current?.(remoteName);
            }
            return;
          }

          const fallbackColor = '#38bdf8';
          const localId = localPresenceRef.current?.id ?? null;
          const remoteClientIds = new Set<string>();
          const derived = message.clients
            .filter(entry => typeof entry.userId === 'string' && entry.userId.length > 0)
            .map(entry => {
              if (typeof entry.clientId === 'string' && entry.clientId !== clientId) {
                remoteClientIds.add(entry.clientId);
              }
              return {
                clientId: `sse:${entry.clientId}`,
                userId: entry.userId ?? entry.clientId,
                name: entry.name ?? null,
                color: entry.color ?? fallbackColor,
                avatar: entry.avatar ?? null,
                isSelf: Boolean(localId && entry.userId === localId),
              } satisfies CollaboratorPresence;
            });

          presenceStateRef.current = derived;
          onPresenceChangeRef.current?.(derived);

          const previous = knownSseClientsRef.current;
          const newPeers: string[] = [];
          remoteClientIds.forEach(id => {
            if (!previous.has(id)) {
              newPeers.push(id);
            }
          });
          knownSseClientsRef.current = new Set(remoteClientIds);

          if (newPeers.length > 0 && sseConnected && hasBroadcastableStateRef.current) {
            try {
              const snapshot = Y.encodeStateAsUpdate(ydoc);
              const encoded = encodeYjsUpdate(snapshot);
              if (encoded) {
                postCollaboration({ type: 'update', update: encoded });
              }
            } catch (error) {
              console.error('[Yjs] Failed to publish snapshot for new peers:', error);
            }
          }
        } catch (error) {
          console.error('[Yjs] Failed to parse collaboration message:', error);
        }
      };

      eventSource.onerror = error => {
        console.error('[Yjs] Collaboration stream error:', error);
        sseConnected = false;
        clearPresenceInterval();
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (disposed || typeof window === 'undefined') {
          return;
        }
        if (reconnectTimer !== null) {
          return;
        }
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          openEventStream();
        }, delay);
      };
    };

    openEventStream();

    const shutdownSse = () => {
      flushQueuedUpdates({ allowDuringDispose: true });
      postCollaboration(
        { type: 'presence', presence: null },
        { keepalive: true, preferBeacon: true, allowDuringDispose: true },
      );
      disposed = true;
      sseConnected = false;
      clearUpdateTimer();
      clearPresenceInterval();
      if (eventSource) {
        eventSource.close();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
        }
      }
      presenceStateRef.current = [];
      knownSseClientsRef.current = new Set();
      hasBroadcastableStateRef.current = false;
      onPresenceChangeRef.current?.([]);
    };

    const clientId = generateClientId();
    let disposed = false;
    let eventSource: EventSource | null = null;
    let updateQueue: Uint8Array[] = [];
    let updateTimer: number | null = null;
    let presenceInterval: number | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let sendingRequest = false;
    const pendingRequests: Array<{ body: string; keepalive: boolean; attempt: number }> = [];
    let sseConnected = false;
    let hasConnectedOnce = false;

    type PostOptions = {
      keepalive?: boolean;
      preferBeacon?: boolean;
      allowDuringDispose?: boolean;
    };

    const endpoint = `/api/projects/${projectId}/collaboration`;

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
          console.error('[Yjs] Failed to post collaboration payload:', error);
          sendingRequest = false;
          if (!disposed && typeof window !== 'undefined' && next.attempt < 3) {
            const delay = Math.min(500 * 2 ** next.attempt, 4000);
            window.setTimeout(() => {
              pendingRequests.unshift({
                body: next.body,
                keepalive: next.keepalive,
                attempt: next.attempt + 1,
              });
              processPendingRequests();
            }, delay);
          }
          processPendingRequests();
        });
    };

    const postCollaboration = (payload: CollaborationPayload, options?: PostOptions) => {
      if (disposed && !options?.allowDuringDispose) {
        return;
      }
      const bodyObject =
        payload.type === 'update'
          ? { type: 'update', update: payload.update, clientId }
          : { type: 'presence', presence: payload.presence ?? null, clientId };
      const body = JSON.stringify(bodyObject);

      if (payload.type === 'presence' && options?.preferBeacon && typeof navigator !== 'undefined') {
        try {
          if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) {
            return;
          }
        } catch (error) {
          console.error('[Yjs] Failed to send beacon payload:', error);
        }
      }

      pendingRequests.push({
        body,
        keepalive: options?.keepalive ?? payload.type === 'presence',
        attempt: 0,
      });
      processPendingRequests();
    };

    const clearUpdateTimer = () => {
      if (updateTimer !== null) {
        window.clearTimeout(updateTimer);
        updateTimer = null;
      }
    };

    const clearPresenceInterval = () => {
      if (presenceInterval !== null) {
        window.clearInterval(presenceInterval);
        presenceInterval = null;
      }
    };

    const flushQueuedUpdates = (options?: { allowDuringDispose?: boolean }) => {
      clearUpdateTimer();
      if (!updateQueue.length) {
        return;
      }
      if (!sseConnected && !options?.allowDuringDispose) {
        if (typeof window !== 'undefined') {
          updateTimer = window.setTimeout(() => {
            flushQueuedUpdates(options);
          }, 150);
        }
        return;
      }
      try {
        const merged = Y.mergeUpdates(updateQueue);
        updateQueue = [];
        const encoded = encodeYjsUpdate(merged);
        if (encoded) {
          postCollaboration(
            { type: 'update', update: encoded },
            options?.allowDuringDispose ? { allowDuringDispose: true, keepalive: true } : undefined,
          );
        }
      } catch (error) {
        console.error('[Yjs] Failed to merge queued updates:', error);
        updateQueue = [];
      }
    };

    const enqueueUpdateForSse = (update: Uint8Array) => {
      updateQueue.push(update);
      if (updateTimer !== null) {
        return;
      }
      updateTimer = window.setTimeout(() => {
        flushQueuedUpdates();
      }, 120);
    };

    const handlePageHide = () => {
      flushQueuedUpdates({ allowDuringDispose: true });
      postCollaboration({ type: 'presence', presence: null }, {
        keepalive: true,
        preferBeacon: true,
        allowDuringDispose: true,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }

    const sendPresencePayload = (
      presence: LocalCollaboratorPresence | null,
      options?: PostOptions,
    ) => {
      postCollaboration({ type: 'presence', presence }, options);
    };

    const openEventStream = () => {
      if (eventSource) {
        eventSource.close();
      }

      sseConnected = false;
      clearPresenceInterval();

      try {
        eventSource = new EventSource(
          `${endpoint}?clientId=${encodeURIComponent(clientId)}`
        );
      } catch (error) {
        console.error('[Yjs] Failed to initialize collaboration stream:', error);
        if (typeof window !== 'undefined') {
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            openEventStream();
          }, delay);
        }
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        sseConnected = true;
        if (reconnectTimer !== null && typeof window !== 'undefined') {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        flushQueuedUpdates();
        const presence = localPresenceRef.current;
        if (presence) {
          sendPresencePayload(presence);
        }
        if (hasConnectedOnce && hasBroadcastableStateRef.current) {
          try {
            const snapshot = Y.encodeStateAsUpdate(ydoc);
            const encoded = encodeYjsUpdate(snapshot);
            if (encoded) {
              postCollaboration({ type: 'update', update: encoded });
            }
          } catch (error) {
            console.error('[Yjs] Failed to publish reconnect snapshot:', error);
          }
        }
        clearPresenceInterval();
        presenceInterval = window.setInterval(() => {
          const latestPresence = localPresenceRef.current;
          if (latestPresence) {
            sendPresencePayload(latestPresence);
          }
        }, 20000);
        hasConnectedOnce = true;
      };

      eventSource.onmessage = event => {
        if (!event.data) {
          return;
        }
        try {
          const message = JSON.parse(event.data) as CollaborationServerMessage;
          if (message.type === 'update') {
            if (!message.update || message.clientId === clientId) {
              return;
            }
            const decoded = decodeStateBase64(message.update);
            if (!decoded) {
              return;
            }
            try {
              Y.applyUpdate(ydoc, decoded, 'collab-sse');
              hasBroadcastableStateRef.current = true;
            } catch (error) {
              console.error('[Yjs] Failed to apply collaboration update:', error);
            }
            return;
          }

          const localId = localPresenceRef.current?.id ?? null;
          const uniqueClientIds = new Set<string>();
          const remoteClientIds = new Set<string>();
          const derived = message.clients
            .filter(entry => typeof entry.userId === 'string' && entry.userId.length > 0)
            .map(entry => {
              if (typeof entry.clientId === 'string') {
                uniqueClientIds.add(entry.clientId);
                if (entry.clientId !== clientId) {
                  remoteClientIds.add(entry.clientId);
                }
              }
              return {
                clientId: `sse:${entry.clientId}`,
                userId: entry.userId ?? entry.clientId,
                name: entry.name ?? null,
                color: entry.color ?? fallbackColor,
                avatar: entry.avatar ?? null,
                isSelf: Boolean(localId && entry.userId === localId),
              };
            });

          const previous = knownSseClientsRef.current;
          const newPeers: string[] = [];
          remoteClientIds.forEach(id => {
            if (!previous.has(id)) {
              newPeers.push(id);
            }
          });
          knownSseClientsRef.current = remoteClientIds;

          ssePresenceRef.current = derived;
          emitCombinedPresence();

          if (newPeers.length > 0 && sseConnected && hasBroadcastableStateRef.current) {
            try {
              const snapshot = Y.encodeStateAsUpdate(ydoc);
              const encoded = encodeYjsUpdate(snapshot);
              if (encoded) {
                postCollaboration({ type: 'update', update: encoded });
              }
            } catch (error) {
              console.error('[Yjs] Failed to publish snapshot for new peers:', error);
            }
          }
        } catch (error) {
          console.error('[Yjs] Failed to parse collaboration message:', error);
        }
      };

      eventSource.onerror = error => {
        console.error('[Yjs] Collaboration stream error:', error);
        sseConnected = false;
        clearPresenceInterval();
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (disposed || typeof window === 'undefined') {
          return;
        }
        if (reconnectTimer !== null) {
          return;
        }
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          openEventStream();
        }, delay);
      };
    };

    openEventStream();

    const shutdownSse = () => {
      flushQueuedUpdates({ allowDuringDispose: true });
      postCollaboration(
        { type: 'presence', presence: null },
        { keepalive: true, preferBeacon: true, allowDuringDispose: true },
      );
      disposed = true;
      sseConnected = false;
      clearUpdateTimer();
      clearPresenceInterval();
      if (eventSource) {
        eventSource.close();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
        }
      }
      ssePresenceRef.current = [];
      knownSseClientsRef.current = new Set();
      hasBroadcastableStateRef.current = false;
      emitCombinedPresence();
    };

    collabRef.current = {
      ydoc,
      ymap,
      unobserveFiles: () => ymap.unobserve(onFilesChanged),
      sendPresence: presence => {
        sendPresencePayload(presence);
      },
      closeSse: shutdownSse,
      updateProjectName: () => {
        tryBroadcastProjectName(projectNameRef.current ?? pendingProjectName ?? null);
      },
      closeSse: shutdownSse,
    };

    collabRef.current.sendPresence(localPresenceRef.current);
    onDoc?.(ydoc);

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'react->yjs') {
        return;
      }
      hasBroadcastableStateRef.current = true;
      enqueueUpdateForSse(update);
    };
    ydoc.on('update', onDocUpdate);

    return () => {
      try {
        ymap.unobserve(onFilesChanged);
        ydoc.off('update', onDocUpdate);
        ydoc.destroy();
      } catch {}
      ydoc.off('update', onDocUpdate);
      collabRef.current = null;
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      shutdownSse();
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const c = collabRef.current;
    if (!c || suppressLocalSyncRef.current) return;

    const { ydoc, ymap } = c;
    const current = new Map<string, ProjectFile>();
    ymap.forEach((v, k) => v && current.set(k, v));

    const upserts: ProjectFile[] = [];
    const deletes: string[] = [];

    Object.values(files).forEach(file => {
      const prev = current.get(file.path);
      if (!prev || prev.language !== file.language || prev.code !== file.code) {
        upserts.push(file);
      }
      current.delete(file.path);
    });
    current.forEach((_, k) => deletes.push(k));

    if (!upserts.length && !deletes.length) return;

    suppressLocalSyncRef.current = true;
    ydoc.transact(() => {
      upserts.forEach(f => ymap.set(f.path, cloneProjectFile(f)));
      deletes.forEach(k => ymap.delete(k));
    }, 'react->yjs');
    queueMicrotask(() => (suppressLocalSyncRef.current = false));
  }, [files, projectId]);

  useEffect(() => {
    if (!projectId || !encodedState) return;
    if (appliedSnapshotRef.current === encodedState) return;
    const c = collabRef.current;
    if (!c) return;

    const decoded = decodeStateBase64(encodedState);
    if (!decoded) {
      appliedSnapshotRef.current = encodedState;
      return;
    }

    try {
      c.ydoc.transact(() => Y.applyUpdate(c.ydoc, decoded, 'apply-snapshot'));
      appliedSnapshotRef.current = encodedState;
      hasBroadcastableStateRef.current = true;
      console.log('[Yjs] Applied new snapshot');
    } catch (e) {
      console.error('[Yjs] Failed to apply new snapshot:', e);
    }
  }, [encodedState, projectId]);

  useEffect(() => {
    const id = setInterval(() => collabRef.current?.sendPresence(localPresenceRef.current), 15000);
    return () => clearInterval(id);
  }, []);

  const sandpackFiles = useMemo(() => {
    const out: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => (out[`/${f.path}`] = { code: f.code }));
    return out;
  }, [files]);

  if (children !== undefined) return <>{children}</>;

  return (
    <div className="h-full">
      <Sandpack files={sandpackFiles} template="react" options={{ autorun: true }} />
    </div>
  );
}

