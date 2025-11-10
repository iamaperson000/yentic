'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';
import sharedbClient from 'sharedb/lib/client';
import type { Connection as ShareDBConnection, Doc as ShareDBDoc, JSONOp } from 'sharedb/lib/client';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

type PulseStatus = 'blocked' | 'in-progress' | 'shipped';

type PulseItem = {
  id: string;
  title: string;
  status: PulseStatus;
  owner: string | null;
  updatedAt: number;
};

type Peer = {
  clientId: string;
  name: string | null;
  color: string;
};

type PulseboardDoc = {
  items: Record<string, PulseItem>;
  peers: Record<string, Peer>;
};

type TimerHandle = ReturnType<typeof setTimeout>;

const displayNameKey = 'yentic.dev-test.display-name';
const clientIdKey = 'yentic.dev-test.client-id';

const statusLabel: Record<PulseStatus, string> = {
  blocked: 'Blocked',
  'in-progress': 'In Progress',
  shipped: 'Shipped',
};

const statusToneMap: Record<PulseStatus, string> = {
  blocked: 'bg-rose-500/20 text-rose-200 ring-rose-400/40',
  'in-progress': 'bg-sky-500/20 text-sky-200 ring-sky-400/40',
  shipped: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40',
};

const statusDotMap: Record<PulseStatus, string> = {
  blocked: 'bg-rose-400',
  'in-progress': 'bg-sky-400',
  shipped: 'bg-emerald-400',
};

const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#f59e0b', '#facc15', '#ef4444'];

function generateClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore and fall back to Math.random
  }
  return `client_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getClientId(): string {
  if (typeof window === 'undefined') {
    return generateClientId();
  }
  const stored = window.localStorage.getItem(clientIdKey);
  if (stored) {
    return stored;
  }
  const created = generateClientId();
  window.localStorage.setItem(clientIdKey, created);
  return created;
}

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // ignore and fall back to Math.random
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function colorForClient(clientId: string): string {
  let hash = 0;
  for (let index = 0; index < clientId.length; index += 1) {
    hash = (hash << 5) - hash + clientId.charCodeAt(index);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.round(diff / 60000);
  if (minutes <= 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function statusTone(status: PulseStatus): string {
  return statusToneMap[status] ?? statusToneMap['in-progress'];
}

function statusDot(status: PulseStatus): string {
  return statusDotMap[status] ?? statusDotMap['in-progress'];
}

export default function DevTestPage(): JSX.Element {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [items, setItems] = useState<PulseItem[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<PulseStatus>('in-progress');
  const [displayName, setDisplayName] = useState<string>('');

  const clientIdRef = useRef<string>(getClientId());
  const socketRef = useRef<WebSocket | null>(null);
  const connectionRef = useRef<ShareDBConnection | null>(null);
  const docRef = useRef<ShareDBDoc<PulseboardDoc> | null>(null);
  const reconnectTimerRef = useRef<TimerHandle | null>(null);
  const displayNameValueRef = useRef<string>('');
  const connectRef = useRef<() => void>(() => {});

  const applyDocSnapshot = useCallback(() => {
    const doc = docRef.current;
    const data = doc?.data;
    if (!data) {
      return;
    }
    const nextItems = Object.values(data.items ?? {});
    const nextPeers = Object.values(data.peers ?? {});

    const self = data.peers?.[clientIdRef.current];
    if (
      self &&
      typeof self.name === 'string' &&
      self.name.length > 0 &&
      displayNameValueRef.current.trim().length === 0
    ) {
      displayNameValueRef.current = self.name;
      setDisplayName(self.name);
    }

    setItems(nextItems);
    setPeers(nextPeers);
  }, []);

  const handleDocError = useCallback((error: Error) => {
    console.error('ShareDB document error', error);
  }, []);

  const cleanupShareDB = useCallback(() => {
    const doc = docRef.current;
    if (doc) {
      doc.removeListener('op', applyDocSnapshot);
      doc.removeListener('load', applyDocSnapshot);
      doc.removeListener('error', handleDocError);
      doc.destroy();
      docRef.current = null;
    }
    const connection = connectionRef.current;
    if (connection) {
      try {
        connection.close();
      } catch {
        // ignore connection close errors
      }
      connectionRef.current = null;
    }
  }, [applyDocSnapshot, handleDocError]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current();
    }, 1500);
  }, []);

  const updatePeerName = useCallback(
    (value: string) => {
      const doc = docRef.current;
      const data = doc?.data;
      if (!doc || !data || !data.peers) {
        return;
      }
      const normalized = value.trim();
      const nextValue = normalized.length > 0 ? normalized : null;
      const clientId = clientIdRef.current;
      const existing = data.peers[clientId];

      const ops: JSONOp = [];

      if (!existing) {
        const peer: Peer = {
          clientId,
          name: nextValue,
          color: colorForClient(clientId),
        };
        ops.push({
          p: ['peers', clientId],
          oi: peer,
        });
      } else if ((existing.name ?? null) !== nextValue) {
        ops.push({
          p: ['peers', clientId, 'name'],
          oi: nextValue,
          od: existing.name ?? null,
        });
      } else {
        return;
      }

      doc.submitOp(ops, { source: 'client:presence:update' }, error => {
        if (error) {
          console.error('Failed to update presence', error);
        }
      });
    },
    [],
  );

  const connect = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    cleanupShareDB();

    const existingSocket = socketRef.current;
    if (existingSocket) {
      try {
        existingSocket.close();
      } catch {
        // ignore close errors on stale sockets
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/api/dev-test/realtime?clientId=${encodeURIComponent(
      clientIdRef.current,
    )}`;

    const socket = new WebSocket(url);
    socketRef.current = socket;
    setConnection('connecting');

    socket.addEventListener('open', () => {
      if (socketRef.current !== socket) {
        return;
      }
      setConnection('connected');
    });

    socket.addEventListener('close', () => {
      if (socketRef.current !== socket) {
        return;
      }
      socketRef.current = null;
      setConnection('disconnected');
      cleanupShareDB();
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      if (socketRef.current !== socket) {
        return;
      }
      socket.close();
    });

    const connection = new sharedbClient.Connection(socket);
    connectionRef.current = connection;

    const doc = connection.get<PulseboardDoc>('dev-test', 'pulseboard');
    docRef.current = doc;

    doc.on('op', applyDocSnapshot);
    doc.on('load', applyDocSnapshot);
    doc.on('error', handleDocError);

    doc.subscribe(error => {
      if (error) {
        console.error('Failed to subscribe to ShareDB document', error);
        return;
      }
      applyDocSnapshot();
      updatePeerName(displayNameValueRef.current);
    });
  }, [applyDocSnapshot, cleanupShareDB, handleDocError, scheduleReconnect, updatePeerName]);

  connectRef.current = connect;

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      const socket = socketRef.current;
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore close errors on unmount
        }
      }
      cleanupShareDB();
    };
  }, [cleanupShareDB, connect]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(displayNameKey);
    if (stored) {
      setDisplayName(stored);
      displayNameValueRef.current = stored;
      updatePeerName(stored);
    }
  }, [updatePeerName]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  const handleDisplayNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDisplayName(value);
      displayNameValueRef.current = value;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(displayNameKey, value);
      }
      updatePeerName(value);
    },
    [updatePeerName],
  );

  const resetForm = useCallback(() => {
    setDraftTitle('');
    setDraftStatus('in-progress');
  }, []);

  const handleCreate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalized = draftTitle.trim();
      if (normalized.length === 0) {
        return;
      }
      const doc = docRef.current;
      if (!doc || !doc.data || !doc.data.items) {
        return;
      }
      const owner = displayNameValueRef.current.trim();
      const item: PulseItem = {
        id: generateId('pulse'),
        title: normalized,
        status: draftStatus,
        owner: owner.length > 0 ? owner : null,
        updatedAt: Date.now(),
      };

      doc.submitOp(
        [
          {
            p: ['items', item.id],
            oi: item,
          },
        ],
        { source: 'client:item:create' },
        error => {
          if (error) {
            console.error('Failed to create item', error);
          }
        },
      );

      resetForm();
    },
    [draftStatus, draftTitle, resetForm],
  );

  const updateStatus = useCallback(
    (itemId: string, status: PulseStatus) => {
      const doc = docRef.current;
      const data = doc?.data;
      if (!doc || !data || !data.items) {
        return;
      }
      const current = data.items[itemId];
      if (!current) {
        return;
      }

      const ops: JSONOp = [];
      let changed = false;

      if (current.status !== status) {
        ops.push({
          p: ['items', itemId, 'status'],
          oi: status,
          od: current.status,
        });
        changed = true;
      }

      const owner = displayNameValueRef.current.trim();
      if (owner.length > 0 && (current.owner ?? null) !== owner) {
        ops.push({
          p: ['items', itemId, 'owner'],
          oi: owner,
          od: current.owner ?? null,
        });
        changed = true;
      }

      if (!changed) {
        return;
      }

      ops.push({
        p: ['items', itemId, 'updatedAt'],
        oi: Date.now(),
        od: current.updatedAt,
      });

      doc.submitOp(ops, { source: 'client:item:update' }, error => {
        if (error) {
          console.error('Failed to update item', error);
        }
      });
    },
    [],
  );

  const connectionBadge = useMemo(() => {
    switch (connection) {
      case 'connected':
        return 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/50';
      case 'connecting':
        return 'bg-amber-500/20 text-amber-200 ring-amber-400/50';
      case 'disconnected':
      default:
        return 'bg-rose-500/20 text-rose-200 ring-rose-400/40';
    }
  }, [connection]);

  return (
    <div className="flex min-h-screen flex-col gap-10 bg-[#05070B] px-6 pb-16 pt-14 text-white sm:px-10">
      <header className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">Realtime Lab</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Pulseboard command center</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              A low-latency status wall that streams updates over a dedicated realtime channel. Every change you make is
              broadcast instantly without refreshes or auth requirements.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] ring-1 ring-inset transition ${connectionBadge}`}
            >
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-current" />
              {connection}
            </span>
          </div>
        </div>

        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-emerald-500/10 sm:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60" htmlFor="display-name">
              Your handle
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Let the room know who is adjusting the dials"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
              maxLength={80}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Active peers</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {peers.length === 0 && (
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/40">
                  Just you in here
                </span>
              )}
              {peers.map(peer => (
                <span
                  key={peer.clientId}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/80"
                >
                  <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: peer.color }} />
                  {peer.name ?? 'Anonymous builder'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Add a pulse</p>
            <h2 className="mt-2 text-xl font-semibold">Push a new track to the board</h2>
          </div>
          <form onSubmit={handleCreate} className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
            <input
              value={draftTitle}
              onChange={event => setDraftTitle(event.target.value)}
              placeholder="Ship realtime notifications"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
              maxLength={160}
            />
            <select
              value={draftStatus}
              onChange={event => setDraftStatus(event.target.value as PulseStatus)}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
            >
              <option value="in-progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="shipped">Shipped</option>
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/30"
              disabled={draftTitle.trim().length === 0}
            >
              Broadcast
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedItems.map(item => (
          <article
            key={item.id}
            className="group flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-white shadow-lg shadow-black/40 transition hover:border-emerald-300/60 hover:shadow-emerald-400/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white/90">{item.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.35em] text-white/40">Last update {relativeTime(item.updatedAt)}</p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.35em] ring-1 ring-inset ${statusTone(item.status)}`}
              >
                <span className={`inline-flex h-2 w-2 rounded-full ${statusDot(item.status)}`} />
                {statusLabel[item.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.35em] text-white/70">
                {item.owner ?? 'Unclaimed'}
              </span>
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/40">•</span>
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">{item.id.slice(-6)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['in-progress', 'blocked', 'shipped'] as PulseStatus[]).map(status => (
                <button
                  key={`${item.id}-${status}`}
                  type="button"
                  onClick={() => updateStatus(item.id, status)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] transition ${
                    item.status === status
                      ? 'bg-white text-black'
                      : 'border border-white/15 text-white/70 hover:border-emerald-300/60 hover:text-emerald-200'
                  }`}
                >
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
        {sortedItems.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-sm text-white/50">
            Waiting for the first broadcast…
          </div>
        )}
      </section>
    </div>
  );
}
