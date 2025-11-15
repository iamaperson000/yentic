'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  color?: string;
  text: string;
  timestamp: number;
}

interface InitPayload {
  self: PresenceUser;
  users: PresenceUser[];
  messages: ChatMessage[];
}

interface NameUpdatedPayload {
  id: string;
  name: string;
  previousName?: string;
  color: string;
}

interface DeliveryAck {
  id: string;
}

const formatTime = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));

export default function ChatPage() {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [self, setSelf] = useState<PresenceUser | null>(null);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('Connecting to chatroom…');

  const socketRef = useRef<Socket | null>(null);
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<string>>(() => new Set());
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    function handleConnect() {
      setConnectionState('connected');
      setStatusMessage('Connected. Say hi!');
    }

    function handleDisconnect() {
      setConnectionState('disconnected');
      setStatusMessage('Disconnected. Attempting to reconnect…');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('init', (payload: InitPayload) => {
      setSelf(payload.self);
      setUsers(payload.users);
      setMessages(payload.messages);
      setNameDraft(payload.self.name);
      setStatusMessage('Connected. Say hi!');
    });

    socket.on('users', (payload: PresenceUser[]) => {
      setUsers(payload);
    });

    socket.on('message', (message: ChatMessage) => {
      setMessages(prev => {
        const exists = prev.some(existing => existing.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socket.on('name-updated', (update: NameUpdatedPayload) => {
      setUsers(prev =>
        prev.map(user => (user.id === update.id ? { ...user, name: update.name } : user)),
      );
    });

    socket.on('message-delivered', (ack: DeliveryAck) => {
      setPendingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(ack.id);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!scrollAnchorRef.current) {
      return;
    }
    scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sortedUsers = useMemo(() => {
    if (!self) return users;
    const list = [...users];
    list.sort((a, b) => {
      if (a.id === self.id) return -1;
      if (b.id === self.id) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [users, self]);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = composerValue.trim();
    if (!text) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const optimisticId = `${socket.id}-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      userId: self?.id ?? socket.id ?? 'local-user',
      name: self?.name ?? 'You',
      color: self?.color,
      text,
      timestamp: Date.now(),
    };

    setPendingMessageIds(prev => {
      const next = new Set(prev);
      next.add(optimisticId);
      return next;
    });
    setMessages(prev => [...prev, optimisticMessage]);
    socket.emit('send-message', { text });
    setComposerValue('');
  };

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const trimmed = nameDraft.trim();
    if (!trimmed) {
      return;
    }

    socket.emit('set-name', trimmed);
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl border border-white/10 bg-black/50 p-8 shadow-xl shadow-emerald-500/10">
        <header className="mb-6 flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400/80">Realtime demo</p>
          <h1 className="text-4xl font-semibold text-white">Collaborative Chatroom</h1>
          <p className="max-w-2xl text-base text-white/70">
            Every message you send is broadcast instantly to all connected browsers using Express and
            Socket.IO. We maintain a simple in-memory log so newcomers see recent history, and the
            transport is ready for OT-based document syncing next.
          </p>
          <p className="text-sm text-emerald-300/70">Status: {statusMessage}</p>
        </header>

        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/5">
            <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-5 py-3 text-sm text-white/70">
              <span>
                Connected as <span className="font-semibold text-white">{self?.name ?? 'Guest'}</span>
              </span>
              <span className="text-xs uppercase tracking-widest text-emerald-300/70">
                {connectionState === 'connected' ? 'Live' : connectionState === 'connecting' ? 'Connecting' : 'Reconnecting'}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.map(message => {
                const isSelf = message.userId === self?.id || pendingMessageIds.has(message.id);
                return (
                  <article
                    key={message.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20 ${
                      isSelf
                        ? 'ml-auto bg-emerald-500/90 text-black'
                        : message.userId === 'system'
                          ? 'mx-auto bg-black/40 text-white/70'
                          : 'bg-white/10 text-white'
                    }`}
                    style={
                      message.color && message.userId !== 'system' && !isSelf
                        ? { borderLeft: `4px solid ${message.color}` }
                        : undefined
                    }
                  >
                    <header className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest">
                      <span>{message.name}</span>
                      <span>{formatTime(message.timestamp)}</span>
                    </header>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                  </article>
                );
              })}
              <div ref={scrollAnchorRef} />
            </div>
            <form onSubmit={handleSend} className="border-t border-white/10 bg-black/40 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/60">
                Message
              </label>
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none ring-emerald-400/60 transition focus:ring-2"
                  placeholder="Say something nice…"
                  value={composerValue}
                  onChange={event => setComposerValue(event.target.value)}
                  disabled={connectionState !== 'connected'}
                />
                <button
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/50 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
                  type="submit"
                  disabled={connectionState !== 'connected' || !composerValue.trim()}
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          <aside className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Active users</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {sortedUsers.map(user => (
                  <li key={user.id} className="flex items-center gap-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className={user.id === self?.id ? 'font-semibold text-white' : ''}>{user.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleNameSubmit} className="mt-auto space-y-3 rounded-xl border border-white/10 bg-black/50 p-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-white/60">
                Display name
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/60 px-4 py-2 text-sm text-white outline-none ring-emerald-400/60 transition focus:ring-2"
                value={nameDraft}
                onChange={event => setNameDraft(event.target.value)}
                placeholder="Choose a name"
                maxLength={32}
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-white/90 py-2 text-sm font-semibold text-black transition hover:bg-white"
                disabled={!nameDraft.trim()}
              >
                Update name
              </button>
            </form>
          </aside>
        </div>
      </section>
    </div>
  );
}
