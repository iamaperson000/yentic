'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { io, type Socket } from 'socket.io-client';

import { TextOperation } from 'ot';

interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

interface ChatMessage {
  id: string;
  userId?: string;
  name: string;
  color?: string;
  message: string;
  timestamp: number;
}

interface EventLog {
  id: string;
  message: string;
  timestamp: number;
  color?: string;
}

interface InitPayload {
  doc: string;
  revision: number;
  user: PresenceUser;
  users: PresenceUser[];
}

interface AckPayload {
  revision: number;
}

interface OperationPayload {
  operation: unknown;
  revision: number;
  authorId?: string;
  authorName?: string;
  authorColor?: string;
  timestamp?: number;
}

interface LogPayload {
  message: string;
  timestamp: number;
  user?: PresenceUser;
}

interface NameUpdatedPayload {
  id: string;
  name: string;
  previousName?: string;
  color: string;
  timestamp: number;
}

interface ResyncPayload {
  doc: string;
  revision: number;
  message?: string;
}

function parseMessages(doc: string): ChatMessage[] {
  if (!doc) {
    return [];
  }

  const lines = doc.split('\n').filter(Boolean);
  return lines.map((line, index) => {
    try {
      const parsed = JSON.parse(line) as Partial<ChatMessage> & { timestamp?: number };
      return {
        id: typeof parsed.id === 'string' ? parsed.id : `line-${index}`,
        userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
        name: typeof parsed.name === 'string' ? parsed.name : 'Unknown user',
        color: typeof parsed.color === 'string' ? parsed.color : undefined,
        message: typeof parsed.message === 'string' ? parsed.message : line,
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
      };
    } catch (error) {
      return {
        id: `line-${index}`,
        name: 'System',
        message: line,
        timestamp: Date.now(),
      };
    }
  });
}

function formatTimestamp(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  } catch (error) {
    return '';
  }
}

function createMessagePayload(message: string, author: PresenceUser | null): string {
  const payload = {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: author?.id ?? 'anonymous',
    name: author?.name ?? 'Anonymous',
    color: author?.color,
    message,
    timestamp: Date.now(),
  } satisfies Omit<ChatMessage, 'userId'> & { userId: string };

  return `${JSON.stringify(payload)}\n`;
}

export default function ChatPage() {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [statusMessage, setStatusMessage] = useState('Connecting to collaborative chat server…');
  const [self, setSelf] = useState<PresenceUser | null>(null);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [displayNameDraft, setDisplayNameDraft] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const revisionRef = useRef(0);
  const docRef = useRef('');
  const pendingRef = useRef<TextOperation | null>(null);
  const bufferRef = useRef<TextOperation | null>(null);
  const selfIdRef = useRef<string | null>(null);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  const sortedUsers = useMemo(() => {
    if (!self) {
      return users;
    }

    return users.slice().sort((a, b) => {
      if (a.id === self.id) return -1;
      if (b.id === self.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users, self]);

  const appendLog = useCallback((message: string, tone?: string, timestamp?: number) => {
    setLogs(prev => {
      const entry: EventLog = {
        id: `${timestamp ?? Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        timestamp: timestamp ?? Date.now(),
        color: tone,
      };
      const next = [entry, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const commitDocument = useCallback((nextDoc: string) => {
    docRef.current = nextDoc;
    setMessages(parseMessages(nextDoc));
  }, []);

  const sendOperation = useCallback(
    (operation: TextOperation) => {
      const socket = socketRef.current;
      if (!socket) {
        return;
      }

      if (pendingRef.current) {
        bufferRef.current = bufferRef.current ? bufferRef.current.compose(operation) : operation;
        setStatusMessage('Buffered local changes while awaiting server acknowledgement…');
        return;
      }

      pendingRef.current = operation;
      socket.emit('operation', {
        revision: revisionRef.current,
        operation: operation.toJSON(),
      });
      setStatusMessage('Sent change to server, awaiting acknowledgement…');
    },
    []
  );

  const applyLocalOperation = useCallback(
    (operation: TextOperation) => {
      const nextDoc = operation.apply(docRef.current);
      commitDocument(nextDoc);
      sendOperation(operation);
    },
    [commitDocument, sendOperation]
  );

  const handleSendMessage = useCallback(() => {
    const trimmed = composerValue.trim();
    if (!trimmed) {
      return;
    }

    const serialized = createMessagePayload(trimmed, self);
    const operation = new TextOperation().retain(docRef.current.length).insert(serialized);
    applyLocalOperation(operation);
    setComposerValue('');
  }, [applyLocalOperation, composerValue, self]);

  const handleNameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const desired = displayNameDraft.trim();
      if (!desired || !socketRef.current) {
        return;
      }
      socketRef.current.emit('set-name', desired);
    },
    [displayNameDraft]
  );

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const socket = io({ transports: ['websocket'], upgrade: true });
    socketRef.current = socket;

    const handleConnect = () => {
      setConnectionState('connected');
      setStatusMessage('Connected — waiting for the latest conversation…');
      appendLog('Connected to collaborative chat server', '#34d399');
    };

    const handleDisconnect = (reason: string) => {
      setConnectionState('disconnected');
      setStatusMessage(`Disconnected: ${reason}`);
      appendLog(`Disconnected: ${reason}`, '#f87171');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', error => {
      setConnectionState('disconnected');
      setStatusMessage(`Connection error: ${error.message}`);
      appendLog(`Connection error: ${error.message}`, '#f87171');
    });

    socket.on('init', (payload: InitPayload) => {
      revisionRef.current = payload.revision;
      pendingRef.current = null;
      bufferRef.current = null;
      commitDocument(payload.doc);
      setSelf(payload.user);
      selfIdRef.current = payload.user.id;
      setUsers(payload.users);
      setDisplayNameDraft(payload.user.name ?? '');
      setConnectionState('connected');
      setStatusMessage('Synchronized — start chatting!');
      appendLog('Loaded latest conversation history', payload.user.color);
    });

    socket.on('users', (nextUsers: PresenceUser[]) => {
      setUsers(nextUsers);
    });

    socket.on('ack', (payload: AckPayload) => {
      revisionRef.current = payload.revision;
      pendingRef.current = null;
      if (bufferRef.current) {
        const buffered = bufferRef.current;
        bufferRef.current = null;
        sendOperation(buffered);
        setStatusMessage('Sent buffered updates to server…');
      } else {
        setStatusMessage('All changes acknowledged');
      }
    });

    socket.on('operation', (payload: OperationPayload) => {
      let operation = TextOperation.fromJSON(payload.operation);

      if (pendingRef.current) {
        const [newPending, newOperation] = TextOperation.transform(pendingRef.current, operation);
        pendingRef.current = newPending;
        operation = newOperation;
      }

      if (bufferRef.current) {
        const [newBuffer, newOperation] = TextOperation.transform(bufferRef.current, operation);
        bufferRef.current = newBuffer;
        operation = newOperation;
      }

      const nextDoc = operation.apply(docRef.current);
      commitDocument(nextDoc);
      revisionRef.current = payload.revision;
      setStatusMessage('Received updates from another participant');

      if (payload.authorName) {
        appendLog(`${payload.authorName} sent a message`, payload.authorColor, payload.timestamp);
      }
    });

    socket.on('log', (payload: LogPayload) => {
      appendLog(payload.message, payload.user?.color, payload.timestamp);
    });

    socket.on('name-updated', (payload: NameUpdatedPayload) => {
      if (payload.id === selfIdRef.current) {
        setSelf(current => (current ? { ...current, name: payload.name } : current));
        setDisplayNameDraft(payload.name);
      }
      appendLog(`${payload.previousName ?? 'A participant'} is now ${payload.name}`, payload.color, payload.timestamp);
    });

    socket.on('resync', (payload: ResyncPayload) => {
      revisionRef.current = payload.revision;
      pendingRef.current = null;
      bufferRef.current = null;
      commitDocument(payload.doc);
      setStatusMessage(`Resynced conversation${payload.message ? `: ${payload.message}` : ''}`);
      appendLog('Resynchronized conversation after conflict', '#facc15');
    });

    socket.on('error-message', (payload: { message: string }) => {
      appendLog(payload.message, '#f97316');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [appendLog, commitDocument, sendOperation]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/50 p-10 shadow-[0_30px_80px_-40px_rgba(52,211,153,0.55)]">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/80">Realtime demo</p>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Collaborative Chatroom</h1>
            <p className="mt-3 max-w-2xl text-base text-white/70">
              Send a message and watch it appear instantly on every connected screen. Under the hood we use{' '}
              <span className="font-semibold text-emerald-300">ot.js</span> operational transforms to keep everyone in sync.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    connectionState === 'connected'
                      ? '#34d399'
                      : connectionState === 'connecting'
                        ? '#facc15'
                        : '#f87171',
                }}
              />
              <span className="font-medium text-white">{connectionState === 'connected' ? 'Online' : connectionState}</span>
            </div>
            <p className="mt-1 text-xs text-white/60">{statusMessage}</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div
              ref={messageListRef}
              className="flex h-[360px] flex-col gap-3 overflow-y-auto rounded-xl border border-white/5 bg-black/40 p-4 text-sm text-white/80"
            >
              {messages.length === 0 ? (
                <p className="text-center text-white/50">No messages yet — say hello!</p>
              ) : (
                messages.map(message => (
                  <div key={message.id} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 shadow-[0_12px_30px_-20px_rgba(52,211,153,0.65)]">
                    <span
                      className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full"
                      style={{ backgroundColor: message.color ?? '#38bdf8' }}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className="font-semibold text-white/90">{message.name}</span>
                        <span>·</span>
                        <time dateTime={new Date(message.timestamp).toISOString()}>{formatTimestamp(message.timestamp)}</time>
                      </div>
                      <p className="text-sm text-white/80">{message.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/50">Send a message</label>
              <textarea
                value={composerValue}
                onChange={event => setComposerValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type and press Enter to send…"
                className="mt-2 h-28 w-full resize-none rounded-lg border border-white/10 bg-black/60 p-3 text-sm text-white shadow-inner focus:border-emerald-400 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-white/50">
                  Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem]">Enter</kbd> to send,{' '}
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem]">Shift</kbd> +{' '}
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem]">Enter</kbd> for a newline.
                </span>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/90 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
                  disabled={!composerValue.trim() || connectionState !== 'connected'}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Participants</h2>
              <div className="space-y-2">
                {sortedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: user.color }} />
                      <span className="font-medium text-white">
                        {user.name}
                        {user.id === self?.id ? <span className="ml-1 text-xs text-emerald-300/80">(you)</span> : null}
                      </span>
                    </div>
                    <span className="text-xs text-white/40">{user.id.slice(-4)}</span>
                  </div>
                ))}
                {sortedUsers.length === 0 ? <p className="text-sm text-white/50">Waiting for participants…</p> : null}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Your display name</h2>
              <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
                <input
                  value={displayNameDraft}
                  onChange={event => setDisplayNameDraft(event.target.value)}
                  placeholder="Choose how others see you"
                  className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
                  disabled={!displayNameDraft.trim() || connectionState !== 'connected'}
                >
                  Update name
                </button>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Activity</h2>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/60">
                {logs.length === 0 ? <p className="text-white/40">Waiting for events…</p> : null}
                {logs.map(log => (
                  <div key={log.id} className="flex flex-col gap-1 rounded-lg bg-white/5 p-2">
                    <span className="font-medium" style={{ color: log.color ?? 'inherit' }}>
                      {log.message}
                    </span>
                    <time className="text-[0.7rem] text-white/40" dateTime={new Date(log.timestamp).toISOString()}>
                      {formatTimestamp(log.timestamp)}
                    </time>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
