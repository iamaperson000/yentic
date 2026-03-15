'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Buffer } from 'buffer';
import type { Awareness } from 'y-protocols/awareness';
import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';

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

type CollaborationContextValue = {
  getTextForPath: (path: string) => Y.Text | null;
  awareness: Awareness | null;
  isActive: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LOCAL_ORIGIN = Symbol('collaboration-local');

const CollaborationContext = createContext<CollaborationContextValue>({
  getTextForPath: () => null,
  awareness: null,
  isActive: false,
});

export function useCollaboration() {
  return useContext(CollaborationContext);
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

function sanitizeProjectMap(map: ProjectFileMap): ProjectFileMap {
  const result: ProjectFileMap = {};
  Object.values(map).forEach(file => {
    const sanitized = sanitizeProjectFile(file);
    if (sanitized) {
      result[sanitized.path] = { ...sanitized };
    }
  });
  return result;
}

function decodeSnapshotToMap(encoded: string): ProjectFileMap | null {
  try {
    const binary = typeof window === 'undefined' ? Buffer.from(encoded, 'base64').toString('utf-8') : atob(encoded);
    const parsed = JSON.parse(binary) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const out: ProjectFileMap = {};
    parsed.forEach(entry => {
      const sanitized = sanitizeProjectFile(entry);
      if (sanitized) {
        out[sanitized.path] = { ...sanitized };
      }
    });
    return out;
  } catch {
    return null;
  }
}

function encodeUpdate(update: Uint8Array): string {
  if (typeof window === 'undefined') {
    return Buffer.from(update).toString('base64');
  }
  let binary = '';
  update.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeUpdate(encoded?: string | null): Uint8Array | null {
  if (!encoded) return null;
  try {
    const buffer = typeof window === 'undefined' ? Buffer.from(encoded, 'base64') : Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function applyFilesToMap(target: Y.Map<Y.Map<unknown>>, files: ProjectFileMap) {
  const seen = new Set<string>();

  Object.values(files).forEach(file => {
    let entry = target.get(file.path);
    if (!entry) {
      entry = new Y.Map();
      entry.set('text', new Y.Text());
      target.set(file.path, entry);
    }

    entry.set('language', file.language);
    const text = entry.get('text');
    if (text instanceof Y.Text) {
      const current = text.toString();
      if (current !== file.code) {
        text.delete(0, current.length);
        text.insert(0, file.code);
      }
    }

    seen.add(file.path);
  });

  Array.from(target.keys()).forEach(path => {
    if (!seen.has(path)) {
      target.delete(path);
    }
  });
}

function mapToProjectFileMap(target: Y.Map<Y.Map<unknown>>): ProjectFileMap {
  const snapshot: ProjectFileMap = {};

  target.forEach((entry, path) => {
    if (!(entry instanceof Y.Map)) return;
    const language = entry.get('language');
    const text = entry.get('text');
    const normalized: ProjectFile = {
      path,
      language:
        typeof language === 'string' && ['html', 'css', 'javascript', 'python', 'c', 'cpp', 'java'].includes(language)
          ? (language as ProjectFile['language'])
          : inferLanguage(path),
      code: text instanceof Y.Text ? text.toString() : '',
    };
    const sanitized = sanitizeProjectFile(normalized);
    if (sanitized) {
      snapshot[path] = sanitized;
    }
  });

  return snapshot;
}

function presenceFromAwareness(awareness: Awareness, localPresence?: LocalCollaboratorPresence | null): CollaboratorPresence[] {
  const localId = localPresence?.id ?? null;
  const states: CollaboratorPresence[] = [];

  awareness.getStates().forEach((state, clientId) => {
    const user = (state as { user?: LocalCollaboratorPresence | null } | undefined)?.user;
    if (!user || typeof user.id !== 'string' || user.id.length === 0) {
      return;
    }
    states.push({
      clientId: `yjs:${clientId}`,
      userId: user.id,
      name: user.name ?? null,
      color: user.color ?? null,
      avatar: user.avatar ?? null,
      isSelf: Boolean(localId && user.id === localId),
    });
  });

  return states;
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
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const filesMapRef = useRef<Y.Map<Y.Map<unknown>> | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const initialisedRef = useRef(false);
  const onFilesChangeRef = useRef(onFilesChange);
  const onSnapshotChangeRef = useRef(onSnapshotChange);
  const onPresenceChangeRef = useRef(onPresenceChange);
  const onRemoteMutationRef = useRef(onRemoteMutation);
  const filesRef = useRef(files);
  const encodedStateRef = useRef(encodedState);
  const localPresenceRef = useRef(localPresence);
  const lastEncodedStateRef = useRef<string | null | undefined>(encodedState);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    onFilesChangeRef.current = onFilesChange;
  }, [onFilesChange]);

  useEffect(() => {
    onSnapshotChangeRef.current = onSnapshotChange;
  }, [onSnapshotChange]);

  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange;
  }, [onPresenceChange]);

  useEffect(() => {
    onRemoteMutationRef.current = onRemoteMutation;
  }, [onRemoteMutation]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    encodedStateRef.current = encodedState;
  }, [encodedState]);

  useEffect(() => {
    localPresenceRef.current = localPresence;
  }, [localPresence]);

  const applySnapshotToParent = useCallback(
    (snapshot: ProjectFileMap) => {
      suppressLocalSyncRef.current = true;
      onFilesChangeRef.current(snapshot);
      const doc = ydocRef.current;
      const encoded = doc ? encodeUpdate(Y.encodeStateAsUpdate(doc)) : null;
      onSnapshotChangeRef.current?.(encoded);
      queueMicrotask(() => {
        suppressLocalSyncRef.current = false;
      });
    },
    [],
  );

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') {
      providerRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
      filesMapRef.current = null;
      initialisedRef.current = false;
      lastEncodedStateRef.current = null;
      return;
    }

    const doc = new Y.Doc();
    ydocRef.current = doc;

    const initialEncodedState = encodedStateRef.current;
    const initialFiles = filesRef.current;
    const initialLocalPresence = localPresenceRef.current;
    const update = decodeUpdate(initialEncodedState);
    if (update) {
      try {
        Y.applyUpdate(doc, update);
      } catch (error) {
        console.error('[CollaborativeEditor] Failed to apply saved state', error);
      }
    } else {
      const legacy = initialEncodedState ? decodeSnapshotToMap(initialEncodedState) : null;
      if (legacy) {
        doc.transact(() => {
          applyFilesToMap(doc.getMap('files'), legacy);
        }, LOCAL_ORIGIN);
      }
    }

    const filesMap = doc.getMap<Y.Map<unknown>>('files');
    filesMapRef.current = filesMap;

    if (filesMap.size === 0) {
      const sanitized = sanitizeProjectMap(initialFiles);
      doc.transact(() => applyFilesToMap(filesMap, sanitized), LOCAL_ORIGIN);
    }

    const provider = new WebrtcProvider(`project-${projectId}`, doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-us.herokuapp.com',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
      ],
      maxConns: 20,
      filterBcConns: true,
    });
    providerRef.current = provider;

    const handleAwarenessUpdate = () => {
      setAwareness(provider.awareness);
      setIsActive(true);
      const presence = presenceFromAwareness(provider.awareness, localPresenceRef.current);
      onPresenceChangeRef.current?.(presence);
    };

    provider.awareness.setLocalStateField('user', initialLocalPresence ?? null);
    provider.awareness.on('update', handleAwarenessUpdate);
    handleAwarenessUpdate();

    const handleDocUpdate = () => {
      onSnapshotChangeRef.current?.(encodeUpdate(Y.encodeStateAsUpdate(doc)));
    };

    const handleFilesChange = (_events: unknown, transaction: Y.Transaction) => {
      const snapshot = mapToProjectFileMap(filesMap);
      applySnapshotToParent(snapshot);
      if (!transaction.local) {
        onRemoteMutationRef.current?.();
      }
    };

    doc.on('update', handleDocUpdate);
    filesMap.observeDeep(handleFilesChange);

    // Sync initial snapshot to parent
    applySnapshotToParent(mapToProjectFileMap(filesMap));
    initialisedRef.current = true;
    lastEncodedStateRef.current = initialEncodedState;

    return () => {
      filesMap.unobserveDeep(handleFilesChange);
      doc.off('update', handleDocUpdate);
      provider.awareness.off('update', handleAwarenessUpdate);
      provider.destroy();
      providerRef.current = null;
      doc.destroy();
      ydocRef.current = null;
      filesMapRef.current = null;
      initialisedRef.current = false;
      lastEncodedStateRef.current = null;
      setAwareness(null);
      setIsActive(false);
    };
  }, [applySnapshotToParent, projectId]);

  useEffect(() => {
    if (!projectId) return;
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField('user', localPresence ?? null);
  }, [localPresence, projectId]);

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') {
      return;
    }

    const doc = ydocRef.current;
    const filesMap = filesMapRef.current;
    if (!doc || !filesMap) {
      return;
    }

    const incomingUpdate = decodeUpdate(encodedState);
    const isNewState = encodedState !== lastEncodedStateRef.current;
    lastEncodedStateRef.current = encodedState;

    if (!isNewState) {
      return;
    }

    if (incomingUpdate) {
      try {
        Y.applyUpdate(doc, incomingUpdate);
        return;
      } catch (error) {
        console.error('[CollaborativeEditor] Failed to apply saved state', error);
        return;
      }
    }

    if (encodedState) {
      const legacy = decodeSnapshotToMap(encodedState);
      if (legacy) {
        doc.transact(() => {
          applyFilesToMap(filesMap, legacy);
        }, LOCAL_ORIGIN);
      }
    }
  }, [encodedState, projectId]);

  useEffect(() => {
    if (!projectId || suppressLocalSyncRef.current) {
      return;
    }
    const doc = ydocRef.current;
    const filesMap = filesMapRef.current;
    if (!doc || !filesMap) {
      return;
    }

    const sanitized = sanitizeProjectMap(files);
    doc.transact(() => applyFilesToMap(filesMap, sanitized), LOCAL_ORIGIN);
  }, [files, projectId]);

  const contextValue: CollaborationContextValue = {
    getTextForPath: (path: string) => {
      const filesMap = filesMapRef.current;
      if (!filesMap) return null;
      const entry = filesMap.get(path);
      const text = entry?.get('text');
      return text instanceof Y.Text ? text : null;
    },
    awareness,
    isActive,
  };

  return <CollaborationContext.Provider value={contextValue}>{children ?? null}</CollaborationContext.Provider>;
}
