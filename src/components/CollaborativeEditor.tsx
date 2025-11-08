'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';

type CollaborativeEditorProps = {
  projectId: string | null;
  files: ProjectFileMap;
  onFilesChange: (files: ProjectFileMap) => void;
  encodedState?: string | null;
  onDoc?: (doc: Y.Doc | null) => void;
  children?: ReactNode;
};

type CollaborationRef = {
  ydoc: Y.Doc;
  provider: WebrtcProvider;
  ymap: Y.Map<ProjectFile>;
  observer: (event: Y.YMapEvent<ProjectFile>) => void;
};

function cloneProjectFile(file: ProjectFile): ProjectFile {
  return {
    path: file.path,
    language: file.language,
    code: file.code,
  };
}

function cloneProjectFiles(files: ProjectFileMap): ProjectFileMap {
  return Object.fromEntries(
    Object.entries(files).map(([key, file]) => [key, cloneProjectFile(file)])
  );
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
  children,
}: CollaborativeEditorProps) {
  const collaborationRef = useRef<CollaborationRef | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const appliedStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      if (collaborationRef.current) {
        collaborationRef.current.ymap.unobserve(collaborationRef.current.observer);
        collaborationRef.current.provider.destroy();
        collaborationRef.current.ydoc.destroy();
        collaborationRef.current = null;
      }
      appliedStateRef.current = null;
      onDoc?.(null);
      return;
    }

    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap<ProjectFile>('files');
    const provider = new WebrtcProvider(`project-${projectId}`, ydoc);
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
    collaborationRef.current = { ydoc, provider, ymap, observer };
    if (isMounted) {
      onDoc?.(ydoc);
    }

    return () => {
      ymap.unobserve(observer);
      provider.destroy();
      ydoc.destroy();
      collaborationRef.current = null;
      appliedStateRef.current = null;
      onDoc?.(null);
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
