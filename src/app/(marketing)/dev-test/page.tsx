'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type Note = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  author: string | null;
  createdAt: number;
};

type PresenceEntry = {
  clientId: string;
  name: string | null;
  color: string | null;
};

type NotePatch = Partial<Pick<Note, 'text' | 'color' | 'x' | 'y'>>;

type WallMessageWithoutIssuer =
  | { kind: 'sync-request'; requesterId: string }
  | { kind: 'sync'; notes: Note[]; revision: number }
  | { kind: 'note-created'; note: Note; revision: number }
  | { kind: 'note-updated'; noteId: string; patch: NotePatch; revision: number }
  | { kind: 'note-removed'; noteId: string; revision: number };

type WallMessage = WallMessageWithoutIssuer & { issuerId: string };

const draftKey = 'yentic.dev-test.displayName';

const palette = ['#FDE68A', '#FCA5A5', '#93C5FD', '#A7F3D0', '#FBCFE8', '#C4B5FD'];

function generateClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function createNoteId(clientId: string): string {
  return `${clientId}:note:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function colorForClient(clientId: string): string {
  let hash = 0;
  for (let index = 0; index < clientId.length; index += 1) {
    hash = (hash << 5) - hash + clientId.charCodeAt(index);
    hash |= 0;
  }
  const colors = ['#34d399', '#38bdf8', '#fbbf24', '#f472b6'];
  return colors[Math.abs(hash) % colors.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeText(text: unknown): string | null {
  if (typeof text !== 'string') {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return '';
  }
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

function sanitizeColor(color: unknown): string | null {
  if (typeof color !== 'string') {
    return null;
  }
  return color.slice(0, 32);
}

function sanitizeCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return clamp(value, 0, 100);
}

function sanitizeNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { id, text, color, x, y, author, createdAt } = raw as Partial<Note> & {
    id?: unknown;
    text?: unknown;
    color?: unknown;
    x?: unknown;
    y?: unknown;
    author?: unknown;
    createdAt?: unknown;
  };

  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  const normalizedText = sanitizeText(text);
  if (normalizedText === null) {
    return null;
  }

  const normalizedColor = sanitizeColor(color) ?? palette[0];
  const normalizedX = sanitizeCoordinate(x) ?? 50;
  const normalizedY = sanitizeCoordinate(y) ?? 50;

  let normalizedAuthor: string | null = null;
  if (typeof author === 'string') {
    normalizedAuthor = author.slice(0, 120);
  }

  const normalizedCreatedAt =
    typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : Date.now();

  return {
    id,
    text: normalizedText,
    color: normalizedColor,
    x: normalizedX,
    y: normalizedY,
    author: normalizedAuthor,
    createdAt: normalizedCreatedAt,
  };
}

function sanitizePatch(raw: unknown): NotePatch | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const patch = raw as NotePatch & {
    text?: unknown;
    color?: unknown;
    x?: unknown;
    y?: unknown;
  };
  const result: NotePatch = {};
  if (Object.prototype.hasOwnProperty.call(patch, 'text')) {
    const normalized = sanitizeText(patch.text);
    if (normalized === null) {
      return null;
    }
    result.text = normalized;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
    const normalized = sanitizeColor(patch.color);
    if (normalized === null) {
      return null;
    }
    result.color = normalized;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'x')) {
    const normalized = sanitizeCoordinate(patch.x);
    if (normalized === null) {
      return null;
    }
    result.x = normalized;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'y')) {
    const normalized = sanitizeCoordinate(patch.y);
    if (normalized === null) {
      return null;
    }
    result.y = normalized;
  }
  return result;
}

function parseWallMessage(raw: string): WallMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const { kind, issuerId } = parsed as { kind?: unknown; issuerId?: unknown };
  if (typeof kind !== 'string' || typeof issuerId !== 'string' || issuerId.length === 0) {
    return null;
  }
  if (kind === 'sync-request') {
    const requesterId = (parsed as { requesterId?: unknown }).requesterId;
    if (typeof requesterId !== 'string' || requesterId.length === 0) {
      return null;
    }
    return { kind, issuerId, requesterId };
  }
  if (kind === 'sync') {
    const notesRaw = (parsed as { notes?: unknown }).notes;
    const revision = (parsed as { revision?: unknown }).revision;
    if (!Array.isArray(notesRaw) || typeof revision !== 'number' || !Number.isFinite(revision)) {
      return null;
    }
    const notes: Note[] = [];
    notesRaw.forEach(item => {
      const note = sanitizeNote(item);
      if (note) {
        notes.push(note);
      }
    });
    notes.sort((a, b) => a.createdAt - b.createdAt);
    return { kind, issuerId, notes, revision };
  }
  if (kind === 'note-created') {
    const note = sanitizeNote((parsed as { note?: unknown }).note);
    const revision = (parsed as { revision?: unknown }).revision;
    if (!note || typeof revision !== 'number' || !Number.isFinite(revision)) {
      return null;
    }
    return { kind, issuerId, note, revision };
  }
  if (kind === 'note-updated') {
    const noteId = (parsed as { noteId?: unknown }).noteId;
    const patch = sanitizePatch((parsed as { patch?: unknown }).patch);
    const revision = (parsed as { revision?: unknown }).revision;
    if (
      typeof noteId !== 'string' ||
      noteId.length === 0 ||
      !patch ||
      typeof revision !== 'number' ||
      !Number.isFinite(revision)
    ) {
      return null;
    }
    return { kind, issuerId, noteId, patch, revision };
  }
  if (kind === 'note-removed') {
    const noteId = (parsed as { noteId?: unknown }).noteId;
    const revision = (parsed as { revision?: unknown }).revision;
    if (typeof noteId !== 'string' || noteId.length === 0 || typeof revision !== 'number' || !Number.isFinite(revision)) {
      return null;
    }
    return { kind, issuerId, noteId, revision };
  }
  return null;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function sortNotes(notes: Note[]): Note[] {
  return notes.slice().sort((a, b) => a.createdAt - b.createdAt);
}

function formatTimestamp(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function DevTestPage() {
  const clientIdRef = useRef<string>(generateClientId());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [notes, setNotes] = useState<Note[]>([]);
  const [peers, setPeers] = useState<PresenceEntry[]>([]);
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState(() => palette[0]);
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    try {
      return window.localStorage.getItem(draftKey) ?? '';
    } catch {
      return '';
    }
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const notesRef = useRef<Note[]>(notes);
  const revisionRef = useRef<number>(0);
  const displayNameRef = useRef<string>(displayName.trim());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clientColor] = useState(() => colorForClient(clientIdRef.current));

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const trimmed = displayName.trim();
    displayNameRef.current = trimmed;
    if (typeof window !== 'undefined') {
      try {
        if (trimmed.length > 0) {
          window.localStorage.setItem(draftKey, trimmed);
        } else {
          window.localStorage.removeItem(draftKey);
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [displayName]);

  const sendPresence = useCallback(
    (presence: { id: string; name: string | null; color: string } | null, options?: { keepalive?: boolean; allowDuringDispose?: boolean }) => {
      const body = JSON.stringify({ type: 'presence', clientId: clientIdRef.current, presence });
      if (options?.allowDuringDispose && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon('/api/projects/dev-test/collaboration', blob);
          return;
        } catch {
          // fall through to fetch
        }
      }
      void fetch('/api/projects/dev-test/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: options?.keepalive ?? false,
      }).catch(error => {
        console.error('[Realtime Wall] Failed to send presence', error);
      });
    },
    [],
  );

  const sendWallMessage = useCallback(
    (message: WallMessageWithoutIssuer) => {
      const payload: WallMessage = { ...message, issuerId: clientIdRef.current };
      const serialized = JSON.stringify(payload);
      void fetch('/api/projects/dev-test/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update', clientId: clientIdRef.current, update: serialized }),
        keepalive: true,
      }).catch(error => {
        console.error('[Realtime Wall] Failed to broadcast message', error);
      });
    },
    [],
  );

  const requestSync = useCallback(() => {
    sendWallMessage({ kind: 'sync-request', requesterId: clientIdRef.current });
  }, [sendWallMessage]);

  const handleWallMessage = useCallback(
    (message: WallMessage) => {
      if (message.issuerId === clientIdRef.current) {
        return;
      }
      switch (message.kind) {
        case 'sync-request': {
          if (notesRef.current.length === 0) {
            return;
          }
          if (message.requesterId === clientIdRef.current) {
            return;
          }
          const revision = revisionRef.current || Date.now();
          sendWallMessage({ kind: 'sync', notes: notesRef.current, revision });
          return;
        }
        case 'sync': {
          if (message.revision >= revisionRef.current) {
            revisionRef.current = message.revision;
            setNotes(sortNotes(message.notes));
          }
          return;
        }
        case 'note-created': {
          revisionRef.current = Math.max(revisionRef.current, message.revision);
          setNotes(prev => {
            const exists = prev.some(note => note.id === message.note.id);
            if (exists) {
              return sortNotes(prev.map(note => (note.id === message.note.id ? message.note : note)));
            }
            return sortNotes([...prev, message.note]);
          });
          return;
        }
        case 'note-updated': {
          revisionRef.current = Math.max(revisionRef.current, message.revision);
          setNotes(prev =>
            prev.map(note =>
              note.id === message.noteId
                ? {
                    ...note,
                    ...message.patch,
                  }
                : note,
            ),
          );
          return;
        }
        case 'note-removed': {
          revisionRef.current = Math.max(revisionRef.current, message.revision);
          setNotes(prev => prev.filter(note => note.id !== message.noteId));
          return;
        }
        default:
          return;
      }
    },
    [sendWallMessage],
  );

  useEffect(() => {
    let disposed = false;
    const connect = () => {
      const source = new EventSource(`/api/projects/dev-test/collaboration?clientId=${clientIdRef.current}`);
      eventSourceRef.current = source;
      setConnectionStatus('connecting');

      source.onopen = () => {
        setConnectionStatus('connected');
        sendPresence({ id: clientIdRef.current, name: displayNameRef.current || null, color: clientColor });
        requestSync();
      };

      source.onmessage = event => {
        if (!event.data) {
          return;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!payload || typeof payload !== 'object') {
          return;
        }
        const { type } = payload as { type?: unknown };
        if (type === 'presence') {
          const list = (payload as { clients?: unknown }).clients;
          if (Array.isArray(list)) {
            const sanitized: PresenceEntry[] = [];
            list.forEach(entry => {
              if (!entry || typeof entry !== 'object') {
                return;
              }
              const { clientId, name, color } = entry as PresenceEntry & {
                clientId?: unknown;
                name?: unknown;
                color?: unknown;
              };
              if (typeof clientId === 'string' && clientId.length > 0) {
                sanitized.push({
                  clientId,
                  name: typeof name === 'string' ? name.slice(0, 120) : null,
                  color: typeof color === 'string' ? color.slice(0, 32) : null,
                });
              }
            });
            setPeers(sanitized);
          }
          return;
        }
        if (type === 'update') {
          const update = (payload as { update?: unknown }).update;
          if (typeof update === 'string' && update.length > 0) {
            const parsed = parseWallMessage(update);
            if (parsed) {
              handleWallMessage(parsed);
            }
          }
        }
      };

      source.onerror = () => {
        setConnectionStatus('disconnected');
        source.close();
        if (!disposed) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 1500);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      eventSourceRef.current?.close();
      sendPresence(null, { allowDuringDispose: true });
    };
  }, [clientColor, handleWallMessage, requestSync, sendPresence]);

  const handleCreateNote = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalized = draftText.trim();
      if (normalized.length === 0) {
        return;
      }
      const revision = Date.now();
      revisionRef.current = Math.max(revisionRef.current, revision);
      const note: Note = {
        id: createNoteId(clientIdRef.current),
        text: normalized.length > 500 ? normalized.slice(0, 500) : normalized,
        color: draftColor,
        x: clamp(randomBetween(8, 72), 5, 85),
        y: clamp(randomBetween(10, 78), 5, 85),
        author: displayNameRef.current.length > 0 ? displayNameRef.current : 'Guest',
        createdAt: revision,
      };
      setNotes(prev => sortNotes([...prev, note]));
      sendWallMessage({ kind: 'note-created', note, revision });
      setDraftText('');
    },
    [draftColor, draftText, sendWallMessage],
  );

  const updateNote = useCallback(
    (noteId: string, patch: NotePatch) => {
      setNotes(prev => prev.map(note => (note.id === noteId ? { ...note, ...patch } : note)));
      const revision = Date.now();
      revisionRef.current = Math.max(revisionRef.current, revision);
      sendWallMessage({ kind: 'note-updated', noteId, patch, revision });
    },
    [sendWallMessage],
  );

  const removeNote = useCallback(
    (noteId: string) => {
      setNotes(prev => prev.filter(note => note.id !== noteId));
      const revision = Date.now();
      revisionRef.current = Math.max(revisionRef.current, revision);
      sendWallMessage({ kind: 'note-removed', noteId, revision });
    },
    [sendWallMessage],
  );

  const connectionLabel = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Reconnecting…';
      default:
        return 'Connecting…';
    }
  }, [connectionStatus]);

  const activePeers = useMemo(() => peers.filter(entry => entry.clientId !== clientIdRef.current), [peers]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-12">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-emerald-500/10">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Realtime Wall
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'bg-amber-500/20 text-amber-100'
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {connectionLabel}
          </span>
        </div>
        <p className="max-w-3xl text-sm text-white/70">
          Sketch ideas together on a shared canvas of sticky notes. Updates broadcast instantly over the collaboration
          service—no refreshes, no polling, and no locks. Drop a card, edit in place, and watch changes sync to other
          participants in real time.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
          <div className="inline-flex items-center gap-2">
            <span className="font-semibold text-white">You:</span>
            <input
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              className="w-40 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white outline-none transition focus:border-emerald-300 focus:bg-black/40"
              placeholder="Set a name"
              maxLength={60}
            />
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="font-semibold text-white">Peers online:</span>
            {activePeers.length === 0 ? (
              <span className="text-white/50">Just you for now</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {activePeers.map(peer => (
                  <span
                    key={peer.clientId}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: peer.color ?? '#94a3b8' }}
                    />
                    {peer.name ?? 'Anonymous'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <form
        onSubmit={handleCreateNote}
        className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-emerald-500/10 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
            New note
          </label>
          <textarea
            value={draftText}
            onChange={event => setDraftText(event.target.value)}
            placeholder="Capture an idea to share with the room"
            className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
            maxLength={500}
          />
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Color</span>
          <div className="flex flex-wrap gap-2">
            {palette.map(color => (
              <button
                type="button"
                key={color}
                onClick={() => setDraftColor(color)}
                className={`h-9 w-9 rounded-full border transition ${
                  draftColor === color ? 'border-emerald-400 ring-2 ring-emerald-400/60' : 'border-white/30'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color} for the note`}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="h-12 rounded-2xl bg-emerald-500 px-6 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/30"
          disabled={draftText.trim().length === 0}
        >
          Drop note
        </button>
      </form>

      <section className="relative min-h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-10 shadow-2xl shadow-emerald-500/10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_55%)]" />
        <div className="relative flex h-full flex-col gap-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
            <span>Shared canvas</span>
            <span>{notes.length} notes</span>
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0">
              {notes.map(note => (
                <article
                  key={note.id}
                  className="group absolute flex w-60 flex-col gap-3 rounded-2xl border border-black/10 p-4 text-slate-900 shadow-lg shadow-black/20 transition hover:scale-[1.02]"
                  style={{
                    left: `${note.x}%`,
                    top: `${note.y}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: note.color,
                  }}
                >
                  <textarea
                    value={note.text}
                    onChange={event => updateNote(note.id, { text: event.target.value })}
                    className="h-24 w-full resize-none rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-black/40"
                    maxLength={500}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-700">
                    <span>{note.author ?? 'Anonymous'}</span>
                    <span>{formatTimestamp(note.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      {palette.map(color => (
                        <button
                          type="button"
                          key={`${note.id}-${color}`}
                          onClick={() => updateNote(note.id, { color })}
                          className={`h-6 w-6 rounded-full border border-black/20 transition ${
                            note.color === color ? 'ring-2 ring-black/50' : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label="Change note color"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNote(note.id)}
                      className="rounded-full border border-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-black/60 transition hover:border-black/60 hover:text-black"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
