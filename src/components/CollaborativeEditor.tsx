'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { Awareness } from 'y-protocols/awareness';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';
import type { CollaboratorPresence, LocalCollaboratorPresence } from '@/types/collaboration';

/** ──────────────────────────────────────────────────────────────────────────
 *  Types
 *  ────────────────────────────────────────────────────────────────────────── */
type CollaborativeEditorProps = {
  projectId: string | null;
  files: ProjectFileMap;
  onFilesChange: (files: ProjectFileMap) => void;
  encodedState?: string | null;              // base64 snapshot stored in Prisma
  onDoc?: (doc: Y.Doc | null) => void;       // optional for external hooks
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

/** ──────────────────────────────────────────────────────────────────────────
 *  Helpers
 *  ────────────────────────────────────────────────────────────────────────── */
function cloneProjectFile(file: ProjectFile): ProjectFile {
  return { path: file.path, language: file.language, code: file.code };
}

function normalizeProjectFile(path: string, file: Partial<ProjectFile>): ProjectFile {
  const normalizedPath = (file.path?.trim() || path.trim() || path);
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
        const normalized = normalizeProjectFile(legacyPath, legacyFile ?? {});
        result[normalized.path] = cloneProjectFile(normalized);
      });
      return;
    }
    const normalizedPath = (typeof value.path === 'string' && value.path.length > 0) ? value.path : key;
    result[normalizedPath] = cloneProjectFile({ path: normalizedPath, language: value.language, code: value.code });
  });
  return result;
}

function decodeStateBase64(encoded?: string | null): Uint8Array | null {
  if (!encoded) return null;
  try {
    if (typeof window === 'undefined') {
      // SSR safeguard
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

/** ──────────────────────────────────────────────────────────────────────────
 *  Component
 *  ────────────────────────────────────────────────────────────────────────── */
export default function CollaborativeEditor(props: CollaborativeEditorProps) {
  const {
    projectId,
    files,
    onFilesChange,
    encodedState,
    onDoc,
    localPresence,
    onPresenceChange,
    children,
  } = props;

  /** Stateful refs that survive re-renders and strict-mode */
  const collabRef = useRef<CollaborationRef | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const appliedSnapshotRef = useRef<string | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const localPresenceRef = useRef<LocalCollaboratorPresence | null>(null);
  const onPresenceChangeRef = useRef<((p: CollaboratorPresence[]) => void) | undefined>(undefined);

  /* keep callbacks/presence refs fresh */
  useEffect(() => { onPresenceChangeRef.current = onPresenceChange ?? undefined; }, [onPresenceChange]);
  useEffect(() => {
    localPresenceRef.current = localPresence ?? null;
    collabRef.current?.sendPresence(localPresenceRef.current);
  }, [localPresence]);

  /** Initialize / Recreate Y.Doc + WebRTC for a project */
  useEffect(() => {
    if (!projectId || typeof window === 'undefined') {
      // teardown when leaving a project
      if (collabRef.current) {
        try {
          collabRef.current.unobserveFiles?.();
          collabRef.current.unsubscribePresence?.();
          collabRef.current.awareness?.setLocalState(null);
          providerRef.current?.destroy();
          collabRef.current.ydoc.destroy();
        } catch {/* noop */}
        collabRef.current = null;
        providerRef.current = null;
      }
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      onPresenceChangeRef.current?.([]);
      return;
    }

    // Full teardown if switching projects
    if (collabRef.current) {
      try {
        collabRef.current.unobserveFiles?.();
        collabRef.current.unsubscribePresence?.();
        collabRef.current.awareness?.setLocalState(null);
        providerRef.current?.destroy();
        collabRef.current.ydoc.destroy();
      } catch {/* noop */}
      collabRef.current = null;
      providerRef.current = null;
    }

    // Build a fresh doc
    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap<ProjectFile>('files');

    // Apply stored snapshot ONCE (before any peer update)
    if (encodedState && !appliedSnapshotRef.current) {
      const decoded = decodeStateBase64(encodedState);
      if (decoded) {
        try {
          Y.applyUpdate(ydoc, decoded, 'bootstrap');
          appliedSnapshotRef.current = encodedState;
          // eslint-disable-next-line no-console
          console.log('[Yjs] Applied bootstrap snapshot');
        } catch (e) {
          console.error('[Yjs] Failed to apply bootstrap snapshot:', e);
        }
      } else {
        appliedSnapshotRef.current = encodedState; // avoid retry loop on bad data
      }
    }

    // If doc is still empty, seed from props.files
    if (ymap.size === 0) {
      ydoc.transact(() => {
        Object.values(files).forEach(f => ymap.set(f.path, cloneProjectFile(f)));
      }, 'seed-from-props');
    } else {
      // If it had content (from snapshot), push it to React state
      const existing = projectFilesFromYMap(ymap);
      suppressLocalSyncRef.current = true;
      onFilesChange(existing);
      queueMicrotask(() => { suppressLocalSyncRef.current = false; });
    }

    // Observe Y.Map → push remote changes to React state
    const onFilesChanged = (evt: Y.YMapEvent<ProjectFile>) => {
      if (evt.transaction.local || suppressLocalSyncRef.current) return;
      const next = projectFilesFromYMap(evt.target);
      suppressLocalSyncRef.current = true;
      onFilesChange(next);
      queueMicrotask(() => { suppressLocalSyncRef.current = false; });
    };
    ymap.observe(onFilesChanged);

    // Create WebRTC provider
    let provider: WebrtcProvider | null = null;
    let awareness: Awareness | null = null;

    try {
      provider = new WebrtcProvider(`yentic-project-${projectId}`, ydoc, {
        // Multiple public signalers; replace with your own later if needed
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

      provider.on('status', ({ status }) => {
        // eslint-disable-next-line no-console
        console.log(`[Yjs] WebRTC status: ${status} (room: yentic-project-${projectId})`);
      });

      awareness = provider.awareness;
    } catch (e) {
      console.error('[Yjs] Failed to initialize WebRTC provider:', e);
    }

    // Presence wiring (→ UI)
    const fallbackColor = '#38bdf8';
    const emitPresenceSnapshot = () => {
      if (!awareness) { onPresenceChangeRef.current?.([]); return; }
      const out: CollaboratorPresence[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (!state || typeof state !== 'object') return;
        const p = (state as any).presence as LocalCollaboratorPresence | null | undefined;
        if (!p || typeof p !== 'object' || typeof p.id !== 'string' || p.id.trim() === '') return;
        out.push({
          clientId: String(clientId),
          userId: p.id,
          name: (typeof p.name === 'string' && p.name.trim()) ? p.name : null,
          color: (typeof p.color === 'string' && p.color.trim()) ? p.color : fallbackColor,
          avatar: (typeof p.avatar === 'string' && p.avatar.length > 0) ? p.avatar : null,
          isSelf: awareness ? clientId === awareness.clientID : false,
        });
      });
      onPresenceChangeRef.current?.(out);
    };

    if (awareness) {
      awareness.on('update', emitPresenceSnapshot);
      emitPresenceSnapshot(); // initial
    }

    // Compose the collaboration ref
    collabRef.current = {
      ydoc,
      ymap,
      provider,
      awareness,
      unobserveFiles: () => ymap.unobserve(onFilesChanged),
      unsubscribePresence: awareness ? () => awareness.off('update', emitPresenceSnapshot) : null,
      sendPresence: (presence) => {
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

    providerRef.current = provider ?? null;

    // Send local presence immediately (if provided)
    collabRef.current.sendPresence(localPresenceRef.current);

    // Expose doc upwards if needed
    onDoc?.(ydoc);

    return () => {
      // Hard teardown ONLY when unmounting / switching project
      try {
        ymap.unobserve(onFilesChanged);
        awareness?.off('update', emitPresenceSnapshot);
        awareness?.setLocalState(null);
        provider?.destroy();
        ydoc.destroy();
      } catch {/* noop */}
      collabRef.current = null;
      providerRef.current = null;
      appliedSnapshotRef.current = null;
      onDoc?.(null);
      onPresenceChangeRef.current?.([]);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /** Push React → Yjs (prop changes) without creating loops */
  useEffect(() => {
    if (!projectId) return;
    const c = collabRef.current;
    if (!c || suppressLocalSyncRef.current) return;

    const { ydoc, ymap } = c;

    // Build a quick index of current Y state
    const current = new Map<string, ProjectFile>();
    ymap.forEach((v, k) => { if (v) current.set(k, v); });

    const upserts: ProjectFile[] = [];
    const toDelete: string[] = [];

    Object.values(files).forEach(file => {
      const prev = current.get(file.path);
      if (!prev || prev.language !== file.language || prev.code !== file.code) {
        upserts.push(file);
      }
      current.delete(file.path);
    });

    current.forEach((_, leftover) => toDelete.push(leftover));

    if (!upserts.length && !toDelete.length) return;

    suppressLocalSyncRef.current = true;
    ydoc.transact(() => {
      upserts.forEach(f => ymap.set(f.path, cloneProjectFile(f)));
      toDelete.forEach(k => ymap.delete(k));
    }, 'react->yjs');
    queueMicrotask(() => { suppressLocalSyncRef.current = false; });
  }, [files, projectId]);

  /** If a NEW snapshot arrives later (e.g. from save), apply it once */
  useEffect(() => {
    if (!projectId || !encodedState) return;
    if (appliedSnapshotRef.current === encodedState) return;
    const c = collabRef.current;
    if (!c) return;

    const decoded = decodeStateBase64(encodedState);
    if (!decoded) { appliedSnapshotRef.current = encodedState; return; }

    try {
      c.ydoc.transact(() => {
        Y.applyUpdate(c.ydoc, decoded, 'apply-snapshot');
      });
      appliedSnapshotRef.current = encodedState;
      // eslint-disable-next-line no-console
      console.log('[Yjs] Applied incoming snapshot (post-bootstrap)');
    } catch (e) {
      console.error('[Yjs] Failed to apply incoming snapshot:', e);
    }
  }, [encodedState, projectId]);

  /** Keep presence fresh (tab crashes / network blips) */
  useEffect(() => {
    const id = setInterval(() => {
      const send = collabRef.current?.sendPresence;
      if (send) send(localPresenceRef.current);
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  /** Sandpack file adapter */
  const sandpackFiles = useMemo(() => {
    const out: Record<string, { code: string }> = {};
    Object.values(files).forEach(f => { out[`/${f.path}`] = { code: f.code }; });
    return out;
  }, [files]);

  if (children !== undefined) return <>{children}</>;

  return (
    <div className="h-full">
      <Sandpack files={sandpackFiles} template="react" options={{ autorun: true }} />
    </div>
  );
}
