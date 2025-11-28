'use client';

import Editor from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

import { bindMonacoModel, rangeToCursor } from '@/lib/collaboration/monacoBinding';
import { onAwarenessChange, setLocalUserAwareness, updateLocalCursor } from '@/lib/collaboration/awareness';
import { Y_WEBSOCKET_ENDPOINT } from '@/lib/collaboration/constants';
import { createRoomConnection } from '@/lib/collaboration/yjsRoom';
import type { AwarenessUserState, CollaborationUser, RoomConnection } from '@/lib/collaboration/types';

const DEFAULT_LANGUAGE = 'typescript';

function colorFromString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 70% 60%)`;
}

function normalizeUser(user?: Partial<CollaborationUser>): CollaborationUser {
  const fallbackName = user?.name?.trim() || 'Guest';
  return {
    id: user?.id ?? null,
    name: fallbackName,
    color: user?.color ?? colorFromString(user?.id ?? fallbackName),
    avatar: user?.avatar ?? null,
  };
}

type CollaborativeEditorPageProps = {
  roomName: string;
  initialValue?: string;
  language?: string;
  user?: Partial<CollaborationUser>;
};

export default function CollaborativeEditorPage({ roomName, initialValue, language, user }: CollaborativeEditorPageProps) {
  const resolvedUser = useMemo(() => normalizeUser(user), [user]);
  const initialValueRef = useRef(initialValue ?? '');
  const [activeRoom, setActiveRoom] = useState(roomName);
  const [roomInput, setRoomInput] = useState(roomName);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [peers, setPeers] = useState<AwarenessUserState[]>([]);

  const connectionRef = useRef<RoomConnection | null>(null);
  const bindingCleanupRef = useRef<(() => void) | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<MonacoEditor.ITextModel | null>(null);

  const teardownBinding = useCallback(() => {
    bindingCleanupRef.current?.();
    bindingCleanupRef.current = null;
  }, []);

  const seedInitialValue = useCallback((docText: any) => {
    const yText = docText as { length: number; insert: (index: number, text: string) => void } | undefined;
    if (yText && yText.length === 0 && initialValueRef.current) {
      yText.insert(0, initialValueRef.current);
    }
  }, []);

  useEffect(() => {
    const connection = createRoomConnection(activeRoom, Y_WEBSOCKET_ENDPOINT);
    connectionRef.current = connection;
    seedInitialValue(connection.doc.getText('monaco'));

    setLocalUserAwareness(connection.awareness, resolvedUser);
    const stopAwareness = onAwarenessChange(connection.awareness, setPeers);

    const statusListener = ({ status: nextStatus }: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus(nextStatus);
    };
    connection.provider.on('status', statusListener);
    connection.provider.connect();

    return () => {
      teardownBinding();
      stopAwareness();
      connection.provider.off('status', statusListener);
      connection.destroy();
      connectionRef.current = null;
      setStatus('disconnected');
    };
  }, [activeRoom, resolvedUser, seedInitialValue, teardownBinding]);

  useEffect(() => {
    const awareness = connectionRef.current?.awareness;
    if (awareness) {
      setLocalUserAwareness(awareness, resolvedUser);
    }
  }, [resolvedUser]);

  const handleCursorBroadcast = useCallback(() => {
    const awareness = connectionRef.current?.awareness;
    const editor = editorRef.current;
    const model = modelRef.current;
    if (!awareness || !editor || !model) return;
    updateLocalCursor(awareness, rangeToCursor(editor.getSelection(), model));
  }, []);

  const handleEditorMount = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
      editorRef.current = editor;
      let model = editor.getModel();
      if (!model) {
        model = monaco.editor.createModel(initialValueRef.current, language ?? DEFAULT_LANGUAGE);
        editor.setModel(model);
      }
      modelRef.current = model;

      const connection = connectionRef.current;
      if (!connection) return;

      seedInitialValue(connection.doc.getText('monaco'));
      teardownBinding();
      const { dispose } = bindMonacoModel(editor, model, connection.doc.getText('monaco'), connection.awareness);
      const cursorListener = editor.onDidChangeCursorSelection(() => handleCursorBroadcast());
      const blurListener = editor.onDidBlurEditorWidget(() => updateLocalCursor(connection.awareness, null));
      bindingCleanupRef.current = () => {
        cursorListener.dispose();
        blurListener.dispose();
        dispose();
      };
      handleCursorBroadcast();
    },
    [handleCursorBroadcast, language, seedInitialValue, teardownBinding]
  );

  const switchRoom = useCallback(
    (nextRoom: string) => {
      if (!nextRoom || nextRoom === activeRoom) return;
      setActiveRoom(nextRoom);
    },
    [activeRoom]
  );

  return (
    <div className="flex h-full min-h-[600px] flex-col gap-4">
      <header className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-neutral-700">Room</p>
          <p className="text-lg font-bold text-neutral-900">{activeRoom}</p>
          <p className="text-xs text-neutral-500">Endpoint: {Y_WEBSOCKET_ENDPOINT}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-neutral-600" htmlFor="room-input">
              Switch room
            </label>
            <input
              id="room-input"
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
              value={roomInput}
              onChange={event => setRoomInput(event.target.value)}
              placeholder="Enter room name"
            />
          </div>
          <button
            type="button"
            className="rounded bg-neutral-900 px-3 py-1 text-sm font-semibold text-white"
            onClick={() => switchRoom(roomInput.trim())}
          >
            Join
          </button>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-600">Connection</p>
          <p className="text-sm font-semibold text-neutral-900 capitalize">{status}</p>
        </div>
      </header>

      <div className="flex flex-1 gap-4">
        <aside className="w-64 shrink-0 rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-neutral-700">People in room</p>
          <ul className="space-y-2">
            {peers.map(peer => (
              <li key={peer.clientId} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: peer.color ?? '#888' }}
                  aria-hidden
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-900">{peer.name ?? 'Anonymous'}</span>
                  {peer.cursor ? (
                    <span className="text-xs text-neutral-500">Cursor at {peer.cursor.head}</span>
                  ) : (
                    <span className="text-xs text-neutral-400">No selection</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex-1 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
          <Editor
            key={activeRoom}
            height="70vh"
            defaultLanguage={language ?? DEFAULT_LANGUAGE}
            defaultValue={initialValue}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{ minimap: { enabled: false }, padding: { top: 12, bottom: 12 } }}
          />
        </div>
      </div>
    </div>
  );
}
