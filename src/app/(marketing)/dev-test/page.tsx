'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';

type CollaborationMessage =
  | { type: 'update'; update: string; clientId?: string }
  | { type: 'presence'; clients: Array<{ clientId: string }> };

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

function generateClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function encodeUpdate(update: Uint8Array): string | null {
  try {
    if (typeof window === 'undefined') {
      return Buffer.from(update).toString('base64');
    }
    let binary = '';
    update.forEach(value => {
      binary += String.fromCharCode(value);
    });
    return btoa(binary);
  } catch (error) {
    console.error('[Dev Test] Failed to encode update:', error);
    return null;
  }
}

function decodeUpdate(encoded: string): Uint8Array | null {
  try {
    if (typeof window === 'undefined') {
      return Uint8Array.from(Buffer.from(encoded, 'base64'));
    }
    const binary = atob(encoded);
    const result = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      result[i] = binary.charCodeAt(i);
    }
    return result;
  } catch (error) {
    console.error('[Dev Test] Failed to decode update:', error);
    return null;
  }
}

export default function DevTestPage() {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [peerCount, setPeerCount] = useState(1);
  const statusGuardRef = useRef({ mounted: true });

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
    statusGuardRef.current.mounted = true;
    const element = textAreaRef.current;
    if (!element) {
      return () => {
        statusGuardRef.current.mounted = false;
      };
    }

    const clientId = generateClientId();
    const doc = new Y.Doc();
    const text = doc.getText('dev-test');
    let eventSource: EventSource | null = null;
    let disposed = false;
    const endpoint = '/api/projects/dev-test/collaboration';
    const pendingRequests: Array<{ body: string; keepalive: boolean; attempt: number }> = [];
    let sendingRequest = false;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let updateQueue: Uint8Array[] = [];
    let updateTimer: number | null = null;

    const safeSetStatus = (status: ConnectionStatus) => {
      if (statusGuardRef.current.mounted) {
        setConnectionStatus(status);
      }
    };

    const safeSetPeerCount = (count: number) => {
      if (statusGuardRef.current.mounted) {
        setPeerCount(count);
      }
    };

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
          console.error('[Dev Test] Failed to post collaboration payload:', error);
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

    const postCollaboration = (
      payload: { type: 'update'; update: string } | { type: 'presence'; presence: unknown },
      options?: { keepalive?: boolean; preferBeacon?: boolean; allowDuringDispose?: boolean },
    ) => {
      if (disposed && !options?.allowDuringDispose) {
        return;
      }
      const bodyObject =
        payload.type === 'update'
          ? { type: 'update', update: payload.update, clientId }
          : { type: 'presence', presence: payload.presence, clientId };
      const body = JSON.stringify(bodyObject);

      if (payload.type === 'presence' && options?.preferBeacon && typeof navigator !== 'undefined') {
        try {
          if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) {
            return;
          }
        } catch (error) {
          console.error('[Dev Test] Failed to send beacon payload:', error);
        }
      }

      pendingRequests.push({
        body,
        keepalive: options?.keepalive ?? payload.type === 'presence',
        attempt: 0,
      });
      processPendingRequests();
    };

    const sendPresence = (
      presence: unknown,
      options?: { keepalive?: boolean; preferBeacon?: boolean; allowDuringDispose?: boolean },
    ) => {
      postCollaboration({ type: 'presence', presence }, options);
    };

    const clearUpdateTimer = () => {
      if (updateTimer !== null) {
        window.clearTimeout(updateTimer);
        updateTimer = null;
      }
    };

    const flushQueuedUpdates = (options?: { allowDuringDispose?: boolean }) => {
      clearUpdateTimer();
      if (!updateQueue.length) {
        return;
      }
      try {
        const merged = Y.mergeUpdates(updateQueue);
        updateQueue = [];
        const encoded = encodeUpdate(merged);
        if (encoded) {
          postCollaboration(
            { type: 'update', update: encoded },
            options?.allowDuringDispose
              ? { keepalive: true, allowDuringDispose: true }
              : undefined,
          );
        }
      } catch (error) {
        console.error('[Dev Test] Failed to merge queued updates:', error);
        updateQueue = [];
      }
    };

    const enqueueUpdate = (update: Uint8Array) => {
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
      sendPresence(null, { keepalive: true, preferBeacon: true, allowDuringDispose: true });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }

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

    const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'textarea-input') {
        return;
      }
      enqueueUpdate(update);
    };

    doc.on('update', handleDocUpdate);

    const openEventStream = () => {
      if (eventSource) {
        eventSource.close();
      }

      safeSetStatus('connecting');

      try {
        eventSource = new EventSource(`/api/projects/dev-test/collaboration?clientId=${encodeURIComponent(clientId)}`);
      } catch (error) {
        console.error('[Dev Test] Failed to initialize collaboration stream:', error);
        safeSetStatus('disconnected');
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        safeSetStatus('connected');
        flushQueuedUpdates();
        const snapshot = Y.encodeStateAsUpdate(doc);
        const encoded = encodeUpdate(snapshot);
        if (encoded) {
          postCollaboration({ type: 'update', update: encoded });
        }
        sendPresence({ id: clientId, name: null, color: '#34d399', avatar: null });
      };

      eventSource.onmessage = event => {
        if (!event.data) {
          return;
        }
        try {
          const message = JSON.parse(event.data) as CollaborationMessage;
          if (message.type === 'update') {
            if (!message.update || message.clientId === clientId) {
              return;
            }
            const decoded = decodeUpdate(message.update);
            if (!decoded) {
              return;
            }
            try {
              Y.applyUpdate(doc, decoded, 'collab-sse');
            } catch (error) {
              console.error('[Dev Test] Failed to apply remote update:', error);
            }
            return;
          }

          const count = Math.max(1, message.clients.length);
          safeSetPeerCount(count);
        } catch (error) {
          console.error('[Dev Test] Failed to parse collaboration payload:', error);
        }
      };

      eventSource.onerror = error => {
        console.error('[Dev Test] Collaboration stream error:', error);
        safeSetStatus('disconnected');
        if (reconnectTimer !== null || disposed) {
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

    return () => {
      flushQueuedUpdates({ allowDuringDispose: true });
      sendPresence(null, { keepalive: true, preferBeacon: true, allowDuringDispose: true });
      disposed = true;
      clearUpdateTimer();
      element.removeEventListener('input', handleInput);
      text.unobserve(observer);
      doc.off('update', handleDocUpdate);
      doc.destroy();
      if (eventSource) {
        eventSource.close();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      }
      safeSetStatus('disconnected');
      safeSetPeerCount(1);
      statusGuardRef.current.mounted = false;
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
