'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useRoom,
} from '@liveblocks/react/suspense';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import * as Y from 'yjs';

const ROOM = 'demo:box';
const LOCAL_ORIGIN = Symbol('local');

function Box() {
  const room = useRoom();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState('connecting…');
  const [count, setCount] = useState(1);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;

    const ydoc = new Y.Doc();
    const provider = new LiveblocksYjsProvider(room, ydoc);
    const yText = ydoc.getText('content');
    const awareness = provider.awareness as unknown as {
      setLocalStateField: (k: string, v: unknown) => void;
      getStates: () => Map<number, unknown>;
      on: (e: string, cb: () => void) => void;
      off: (e: string, cb: () => void) => void;
    };
    awareness.setLocalStateField('user', { here: true });

    // remote → textarea
    const render = () => {
      const val = yText.toString();
      if (ta.value === val) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = val;
      ta.setSelectionRange(Math.min(start, val.length), Math.min(end, val.length));
    };
    yText.observe(render);

    // textarea → remote (minimal prefix/suffix diff so concurrent edits still merge)
    const onInput = () => {
      const next = ta.value;
      const prev = yText.toString();
      if (next === prev) return;
      let start = 0;
      const min = Math.min(prev.length, next.length);
      while (start < min && prev[start] === next[start]) start++;
      let endPrev = prev.length;
      let endNext = next.length;
      while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
        endPrev--;
        endNext--;
      }
      ydoc.transact(() => {
        if (endPrev > start) yText.delete(start, endPrev - start);
        if (endNext > start) yText.insert(start, next.slice(start, endNext));
      }, LOCAL_ORIGIN);
    };
    ta.addEventListener('input', onInput);

    const onSync = (synced: boolean) => {
      setStatus(synced ? 'live' : 'connecting…');
      render();
    };
    provider.on('sync', onSync);

    const onAwareness = () => setCount(Math.max(1, awareness.getStates().size));
    awareness.on('change', onAwareness);
    onAwareness();

    return () => {
      yText.unobserve(render);
      ta.removeEventListener('input', onInput);
      awareness.off('change', onAwareness);
      provider.destroy();
      ydoc.destroy();
    };
  }, [room]);

  return (
    <div className="sbox">
      <textarea
        ref={taRef}
        className="sbox-ta"
        placeholder="Type here — everyone in this room sees it live."
        spellCheck={false}
        autoFocus
      />
      <div className="sbox-status">
        <span className={`sbox-dot ${status === 'live' ? 'on' : ''}`} />
        {status} · {count} here
      </div>
    </div>
  );
}

export default function DemoClient() {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-demo-auth">
      <RoomProvider id={ROOM} initialPresence={{}}>
        <ClientSideSuspense
          fallback={
            <div className="sbox">
              <div className="sbox-status">connecting…</div>
            </div>
          }
        >
          <Box />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
