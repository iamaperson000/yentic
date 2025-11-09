'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

const signalingServers = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-us.herokuapp.com',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
];

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export default function DevTestPage() {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [peerCount, setPeerCount] = useState(1);

  const statusLabel = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Reconnecting…';
      default:
        return 'Connecting…';
    }
  }, [connectionStatus]);

  useEffect(() => {
    const element = textAreaRef.current;
    if (!element) {
      return;
    }

    const doc = new Y.Doc();
    const text = doc.getText('dev-test');
    const provider = new WebrtcProvider('yentic-dev-test-room', doc, {
      signaling: signalingServers,
    });

    const applyYTextToTextarea = () => {
      const currentValue = text.toString();
      if (element.value !== currentValue) {
        element.value = currentValue;
      }
    };

    applyYTextToTextarea();

    const observer = () => {
      applyYTextToTextarea();
    };

    text.observe(observer);

    const handleInput = () => {
      const value = element.value;
      doc.transact(
        () => {
          text.delete(0, text.length);
          text.insert(0, value);
        },
        'textarea-input',
      );
    };

    element.addEventListener('input', handleInput);

    const awareness = provider.awareness;
    const updatePeers = () => {
      const states = awareness.getStates();
      setPeerCount(states.size);
    };

    updatePeers();
    awareness.on('update', updatePeers);

    const handleStatus = (event: { connected: boolean }) => {
      setConnectionStatus(event.connected ? 'connected' : 'disconnected');
    };

    provider.on('status', handleStatus);

    return () => {
      element.removeEventListener('input', handleInput);
      text.unobserve(observer);
      awareness.off('update', updatePeers);
      provider.off('status', handleStatus);
      provider.destroy();
      doc.destroy();
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Dev Test</p>
        <h1 className="text-3xl font-semibold">Realtime text area</h1>
        <p className="text-sm text-white/60">
          This page connects directly to the public Yjs WebRTC signaling servers. Open it in multiple tabs to verify that
          keystrokes appear everywhere instantly. No database writes happen here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium transition ${
            connectionStatus === 'connected'
              ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-300' : 'bg-yellow-300'}`} />
          {statusLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-white/70">
          {peerCount} {peerCount === 1 ? 'active tab' : 'active tabs'}
        </span>
      </div>

      <textarea
        ref={textAreaRef}
        placeholder="Start typing to test live sync…"
        className="min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white/90 shadow-inner shadow-black/40 outline-none transition focus:border-emerald-400/60 focus:shadow-emerald-500/10"
      />
    </div>
  );
}
