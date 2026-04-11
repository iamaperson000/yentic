'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Pusher from 'pusher-js';

const pusherConfigured = Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);

export default function ChatPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(pusherConfigured ? 'Connecting to Pusher…' : 'Chat is not configured for this environment.');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!pusherConfigured) {
      return undefined;
    }

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe('chat');

    const handleMessage = data => {
      const text = data?.message ?? '';
      const sender = typeof data?.sender === 'string' ? data.sender : null;
      setMessages(prev => [...prev, sender ? `${sender}: ${text}` : text]);
    };
    const handleConnected = () => {
      setStatus('Connected');
    };
    const handleDisconnected = () => {
      setStatus('Disconnected');
    };
    const handleConnectionError = () => {
      setStatus('Unable to connect');
      setError('Realtime chat is unavailable right now.');
    };

    channel.bind('message', handleMessage);
    pusher.connection.bind('connected', handleConnected);
    pusher.connection.bind('disconnected', handleDisconnected);
    pusher.connection.bind('error', handleConnectionError);

    return () => {
      channel.unbind_all();
      pusher.connection.unbind('connected', handleConnected);
      pusher.connection.unbind('disconnected', handleDisconnected);
      pusher.connection.unbind('error', handleConnectionError);
      pusher.unsubscribe('chat');
      pusher.disconnect();
    };
  }, []);

  const handleSend = async event => {
    event.preventDefault();
    setError('');

    const message = input.trim();
    if (!message) return;

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to send message.' }));
        setError(data.error ?? 'Failed to send message.');
        return;
      }

      setInput('');
    } catch {
      setError('Failed to send message.');
    }
  };

  const canSend = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-[#08090a] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090d]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex flex-wrap items-end justify-between gap-4 px-6 py-7 sm:px-8 sm:py-8">
            <div>
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#9fb0c4]">
                <span className="h-2 w-2 rounded-full bg-[#93a8bf]" />
                Chat lab
              </p>
              <h1 className="mt-3 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#edf3fb] sm:text-[40px]">Realtime messages</h1>
              <p className="mt-2 text-[14px] text-[#b8c5d6]">{status}</p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 transition hover:border-white/40 hover:text-white"
            >
              Back home
            </Link>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[#171d27]">
          <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative flex flex-col gap-5 px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[14px] leading-[1.55] text-[#b8c5d6]">
              {canSend
                ? 'Signed-in users can post messages to the shared chat demo.'
                : sessionStatus === 'loading'
                  ? 'Checking your session…'
                  : 'Sign in to send messages.'}
            </p>

            <div className="min-h-[260px] max-h-[380px] overflow-y-auto rounded-lg border border-[#2f3a4a] bg-[#131923] p-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-[#8ea0b6]">No messages yet.</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg, index) => (
                    <div key={index} className="rounded-md border border-[#2f3a4a] bg-[#171f2d] px-3 py-2 text-sm text-[#d3dfee]">
                      {msg}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="h-11 w-full rounded-full border border-[#3b4a60] bg-[#0f141d] px-4 text-sm text-[#d3dfee] outline-none transition placeholder:text-[#6f8097] focus:border-[#93a8bf]"
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Type a message"
                aria-label="Message"
                disabled={!canSend}
              />
              {canSend ? (
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-slate-200"
                >
                  Send
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white/90 transition hover:border-white/40"
                  onClick={() => signIn('google', { callbackUrl: '/chat' })}
                >
                  Sign in
                </button>
              )}
            </form>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
