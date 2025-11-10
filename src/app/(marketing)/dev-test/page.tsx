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

type ServerMessage =
  | { type: 'snapshot'; items: PulseItem[] }
  | { type: 'item'; item: PulseItem }
  | { type: 'presence'; peers: Peer[] };

const displayNameKey = 'yentic.dev-test.display-name';
const clientIdKey = 'yentic.dev-test.client-id';

const statusLabel: Record<PulseStatus, string> = {
  blocked: 'Blocked',
  'in-progress': 'In Progress',
  shipped: 'Shipped',
};

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
  switch (status) {
    case 'blocked':
      return 'bg-rose-500/20 text-rose-200 ring-rose-400/40';
    case 'shipped':
      return 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40';
    case 'in-progress':
    default:
      return 'bg-sky-500/20 text-sky-200 ring-sky-400/40';
  }
  return result;
}

function statusDot(status: PulseStatus): string {
  switch (status) {
    case 'blocked':
      return 'bg-rose-400';
    case 'shipped':
      return 'bg-emerald-400';
    case 'in-progress':
    default:
      return 'bg-sky-400';
  }
  return null;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function sortNotes(notes: Note[]): Note[] {
  return notes.slice().sort((a, b) => a.createdAt - b.createdAt);
}

async function postUpdate(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/dev-test/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // fire-and-forget; UI will reconcile from stream
  }
}

export default function DevTestPage(): JSX.Element {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [items, setItems] = useState<PulseItem[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<PulseStatus>('in-progress');
  const [displayName, setDisplayName] = useState<string>('');

  const clientIdRef = useRef<string>(getClientId());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayNameRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(displayNameKey);
    if (stored) {
      setDisplayName(stored);
      displayNameRef.current = stored;
      void postUpdate({ type: 'presence', clientId: clientIdRef.current, name: stored });
    }
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  const handleServerMessage = useCallback((message: ServerMessage) => {
    if (message.type === 'snapshot') {
      setItems(message.items);
      return;
    }
    if (message.type === 'item') {
      setItems(prev => {
        const next = prev.filter(item => item.id !== message.item.id);
        next.push(message.item);
        return next;
      });
      return;
    }
    if (message.type === 'presence') {
      setPeers(message.peers);
    }
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setConnection('connecting');
    const source = new EventSource(`/api/dev-test/realtime?clientId=${clientIdRef.current}`);
    eventSourceRef.current = source;

    source.onopen = () => {
      setConnection('connected');
      void postUpdate({ type: 'presence', clientId: clientIdRef.current, name: displayNameRef.current });
    };

    source.onmessage = event => {
      if (!event.data) {
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== 'object') {
        return;
      }
      const { type } = parsed as { type?: unknown };
      if (type === 'snapshot' || type === 'item' || type === 'presence') {
        handleServerMessage(parsed as ServerMessage);
      }
    };

    source.onerror = () => {
      setConnection('disconnected');
      source.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 1500);
    };
  }, [handleServerMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [connect]);

  const handleDisplayNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDisplayName(value);
      displayNameRef.current = value.trim();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(displayNameKey, value);
      }
      void postUpdate({ type: 'presence', clientId: clientIdRef.current, name: displayNameRef.current });
    },
    [],
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
      setDraftTitle('');
      void postUpdate({
        type: 'create',
        clientId: clientIdRef.current,
        title: normalized,
        status: draftStatus,
        owner: displayNameRef.current.length > 0 ? displayNameRef.current : null,
      });
      resetForm();
    },
    [draftStatus, draftTitle, resetForm],
  );

  const updateStatus = useCallback((itemId: string, status: PulseStatus) => {
    void postUpdate({
      type: 'status',
      clientId: clientIdRef.current,
      itemId,
      status,
      owner: displayNameRef.current,
    });
  }, []);

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
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] ring-1 ring-inset transition ${connectionBadge}`}>
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
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.35em] ring-1 ring-inset ${statusTone(item.status)}`}>
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
