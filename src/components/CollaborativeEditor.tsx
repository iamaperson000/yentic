'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

import { type ProjectFileMap } from '@/lib/project';

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
  ymap: Y.Map<ProjectFileMap>;
  observer: () => void;
};

function cloneProjectFiles(files: ProjectFileMap): ProjectFileMap {
  if (typeof structuredClone === 'function') {
    return structuredClone(files);
  }
  return JSON.parse(JSON.stringify(files)) as ProjectFileMap;
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
    const ymap = ydoc.getMap<ProjectFileMap>('files');
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

    if (!ymap.has('files')) {
      ydoc.transact(() => {
        ymap.set('files', cloneProjectFiles(files));
      });
    } else {
      const existing = ymap.get('files');
      if (existing) {
        suppressLocalSyncRef.current = true;
        onFilesChange(cloneProjectFiles(existing));
        Promise.resolve().then(() => {
          suppressLocalSyncRef.current = false;
        });
      }
    }

    const observer = () => {
      const current = ymap.get('files');
      if (!current) {
        return;
      }
      suppressLocalSyncRef.current = true;
      onFilesChange(cloneProjectFiles(current));
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
    collaboration.ydoc.transact(() => {
      collaboration.ymap.set('files', cloneProjectFiles(files));
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

  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="h-full">
      <Sandpack files={sandpackFiles} template="react" options={{ autorun: true }} />
    </div>
  );
}
