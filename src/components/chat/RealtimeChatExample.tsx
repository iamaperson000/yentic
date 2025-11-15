'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useChatSocket } from '@/lib/realtime/chatSocketClient';

type RealtimeChatExampleProps = {
  sessionId: string;
  userId: string;
  displayName?: string;
  authToken?: string;
};

/**
 * Minimal UI showcasing how to wire the reusable hook into a component.
 * This component can be rendered from either App Router or Pages Router entries.
 */
export function RealtimeChatExample({ sessionId, userId, displayName, authToken }: RealtimeChatExampleProps) {
  const [draft, setDraft] = useState('');
  const chat = useChatSocket({
    sessionId,
    user: { id: userId, displayName },
    authToken,
  });

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }
    chat.updatePresence('online', sessionId);
    return () => {
      chat.updatePresence('offline', sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- manual lifecycle management
  }, [sessionId]);

  const typingLabel = useMemo(() => {
    if (chat.typingUsers.length === 0) {
      return '';
    }
    const names = chat.typingUsers.map(entry => entry.displayName).join(', ');
    return `${names} ${chat.typingUsers.length > 1 ? 'are' : 'is'} typing…`;
  }, [chat.typingUsers]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    await chat.sendMessage(draft);
    setDraft('');
    chat.emitTyping(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <header className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Session: {sessionId}</span>
          <span className={chat.connectionState === 'connected' ? 'text-emerald-600' : 'text-amber-600'}>
            {chat.connectionState}
          </span>
        </div>
        {chat.lastError ? <p className="text-xs text-rose-600">{chat.lastError}</p> : null}
        <p className="text-xs text-slate-500">
          Participants: {chat.participants.map(participant => participant.displayName || participant.userId).join(', ') || 'Just you'}
        </p>
      </header>

      <section className="flex-1 space-y-2 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm">
        {chat.messages.length === 0 ? (
          <p className="text-slate-400">No messages yet. Say hello!</p>
        ) : (
          chat.messages.map(message => (
            <article key={message.id} className="rounded-md bg-white p-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{message.displayName}</span>
                <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString()}</time>
              </div>
              <p className="text-slate-800">{message.text}</p>
            </article>
          ))
        )}
      </section>

      <footer className="space-y-2">
        {typingLabel ? <p className="text-xs text-slate-500">{typingLabel}</p> : null}
        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring"
            placeholder="Type a message"
            value={draft}
            onChange={event => {
              const value = event.target.value;
              setDraft(value);
              chat.emitTyping(Boolean(value));
            }}
            onBlur={() => chat.emitTyping(false)}
          />
          <button
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700"
            type="submit"
            disabled={!draft.trim()}
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
