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
};

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

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange ?? undefined;
  }, [onPresenceChange]);

  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    collabRef.current?.sendPresence(localPresenceRef.current);
  }, [localPresence]);

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
        } catch {}
        collabRef.current = null;
      }
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      onPresenceChangeRef.current?.([]);
      return;
    }

    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap<ProjectFile>('files');

    if (encodedState && !appliedSnapshotRef.current) {
      const decoded = decodeStateBase64(encodedState);
      if (decoded) {
        try {
          Y.applyUpdate(ydoc, decoded, 'bootstrap');
          appliedSnapshotRef.current = encodedState;
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
        onPresenceChangeRef.current?.([]);
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
      onPresenceChangeRef.current?.(out);
    };

    if (awareness) {
      awareness.on('update', emitPresenceSnapshot);
      emitPresenceSnapshot();
    }

    collabRef.current = {
      ydoc,
      ymap,
      provider,
      awareness,
      unobserveFiles: () => ymap.unobserve(onFilesChanged),
      unsubscribePresence: awareness ? () => awareness.off('update', emitPresenceSnapshot) : null,
      sendPresence: presence => {
        if (!awareness) return;
        if (!presence) {
          awareness.setLocalState(null);
          return;
        }
        awareness.setLocalStateField('presence', {
          id: presence.id,
          name: presence.name ?? null,
          color: presence.color,
          avatar: presence.avatar ?? null,
        });
      },
    };

    collabRef.current.sendPresence(localPresenceRef.current);
    onDoc?.(ydoc);

    return () => {
      try {
        ymap.unobserve(onFilesChanged);
        awareness?.off('update', emitPresenceSnapshot);
        awareness?.setLocalState(null);
        provider?.destroy();
        ydoc.destroy();
      } catch {}
      collabRef.current = null;
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      onPresenceChangeRef.current?.([]);
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
