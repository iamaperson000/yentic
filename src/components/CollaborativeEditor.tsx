'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { Awareness } from 'y-protocols/awareness';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';
import type { CollaboratorPresence, LocalCollaboratorPresence } from '@/types/collaboration';

/* ────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────── */
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
  provider: WebrtcProvider | null;
  awareness: Awareness | null;
  unobserveFiles: (() => void) | null;
  unsubscribePresence: (() => void) | null;
  sendPresence: (presence: LocalCollaboratorPresence | null) => void;
  closeSse?: () => void;
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
  | { type: 'presence'; clients: ServerPresenceEntry[] };

type CollaborationPayload =
  | { type: 'update'; update: string }
  | { type: 'presence'; presence: LocalCollaboratorPresence | null };

/* ────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────── */
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
          typeof legacyFile === 'object' && legacyFile !== null
            ? (legacyFile as Partial<ProjectFile>)
            : {};
        const normalized = normalizeProjectFile(legacyPath, maybeFile);
        result[normalized.path] = cloneProjectFile(normalized);
      });
      return;
    }
    const normalizedPath =
      typeof value.path === 'string' && value.path.length > 0 ? value.path : key;
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

/* ────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────── */
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
  const collabRef = useRef<CollaborationRef | null>(null);
  const appliedSnapshotRef = useRef<string | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const localPresenceRef = useRef<LocalCollaboratorPresence | null>(null);
  const onPresenceChangeRef = useRef<((p: CollaboratorPresence[]) => void) | undefined>(undefined);
  const webrtcPresenceRef = useRef<CollaboratorPresence[]>([]);
  const ssePresenceRef = useRef<CollaboratorPresence[]>([]);
  const knownSseClientsRef = useRef<Set<string>>(new Set());
  const hasBroadcastableStateRef = useRef(false);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange ?? undefined;
  }, [onPresenceChange]);

  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    collabRef.current?.sendPresence(localPresenceRef.current);
  }, [localPresence]);

  const emitCombinedPresence = () => {
    const primary = webrtcPresenceRef.current;
    const fallback = ssePresenceRef.current;
    const active = primary.length ? primary : fallback;
    onPresenceChangeRef.current?.(active);
  };

  /* Initialize or destroy Yjs provider when project changes */
  useEffect(() => {
    if (!projectId || typeof window === 'undefined') {
      if (collabRef.current) {
        try {
          collabRef.current.unobserveFiles?.();
          collabRef.current.unsubscribePresence?.();
          collabRef.current.awareness?.setLocalState(null);
          collabRef.current.provider?.destroy();
          collabRef.current.ydoc.destroy();
          collabRef.current.closeSse?.();
        } catch {}
        collabRef.current = null;
      }
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      webrtcPresenceRef.current = [];
      ssePresenceRef.current = [];
      emitCombinedPresence();
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
      } else appliedSnapshotRef.current = encodedState;
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

    let provider: WebrtcProvider | null = null;
    let awareness: Awareness | null = null;

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

      // FIX: Correct typing for new y-webrtc event format
      provider.on('status', ({ connected }: { connected: boolean }) => {
        console.log(
          `[Yjs] WebRTC ${connected ? 'connected' : 'disconnected'} (room: ${projectId})`
        );
      });

      awareness = provider.awareness;
    } catch (e) {
      console.error('[Yjs] Failed to init WebRTC provider:', e);
    }

    const fallbackColor = '#38bdf8';
    const emitPresenceSnapshot = () => {
      if (!awareness) {
        webrtcPresenceRef.current = [];
        emitCombinedPresence();
        return;
      }
      const out: CollaboratorPresence[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (!state || typeof state !== 'object') return;
        const p = (state as any).presence as LocalCollaboratorPresence | null;
        if (!p?.id) return;
        out.push({
          clientId: String(clientId),
          userId: p.id,
          name: p.name ?? null,
          color: p.color || fallbackColor,
          avatar: p.avatar ?? null,
          isSelf: awareness ? clientId === awareness.clientID : false,
        });
      });
      webrtcPresenceRef.current = out;
      emitCombinedPresence();
    };

    if (awareness) {
      awareness.on('update', emitPresenceSnapshot);
      emitPresenceSnapshot();
    }

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
      provider,
      awareness,
      unobserveFiles: () => ymap.unobserve(onFilesChanged),
      unsubscribePresence: awareness ? () => awareness.off('update', emitPresenceSnapshot) : null,
      sendPresence: presence => {
        if (awareness) {
          if (!presence) {
            awareness.setLocalState(null);
          } else {
            awareness.setLocalStateField('presence', {
              id: presence.id,
              name: presence.name ?? null,
              color: presence.color,
              avatar: presence.avatar ?? null,
            });
          }
        }
        sendPresencePayload(presence);
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
        awareness?.off('update', emitPresenceSnapshot);
        awareness?.setLocalState(null);
        provider?.destroy();
        ydoc.destroy();
      } catch {}
      ydoc.off('update', onDocUpdate);
      collabRef.current = null;
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      shutdownSse();
      webrtcPresenceRef.current = [];
      emitCombinedPresence();
    };
  }, [projectId]);

  /* React → Yjs */
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

  /* Reapply encoded snapshot if different */
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

  /* Presence heartbeat */
  useEffect(() => {
    const id = setInterval(() => collabRef.current?.sendPresence(localPresenceRef.current), 15_000);
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
