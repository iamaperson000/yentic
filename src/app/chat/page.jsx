'use client';

import { useEffect, useMemo, useState } from 'react';
import Pusher from 'pusher-js';

// Simple realtime chat page using Pusher Channels.
export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // Memoize the Pusher client so it is not recreated on every render.
  const pusherClient = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster =
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn('Missing Pusher environment variables');
    }

    return new Pusher(key, {
      cluster,
      forceTLS: true,
    });
  }, []);

  // Subscribe to the chat channel and listen for new messages.
  useEffect(() => {
    const channel = pusherClient.subscribe('chat');

    const handleIncomingMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          message: data?.message ?? '',
          sentAt: data?.sentAt ?? new Date().toISOString(),
        },
      ]);
    };

    channel.bind('message', handleIncomingMessage);

    return () => {
      channel.unbind('message', handleIncomingMessage);
      pusherClient.unsubscribe('chat');
      pusherClient.disconnect();
    };
  }, [pusherClient]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const trimmed = input.trim();

    if (!trimmed) {
      setError('Please enter a message.');
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send message');
      }

      setInput('');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Realtime Chat (Pusher Channels)</h1>

        <div style={styles.messages}>
          {messages.length === 0 ? (
            <p style={styles.empty}>No messages yet. Be the first to say hello!</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} style={styles.messageRow}>
                <span style={styles.messageText}>{msg.message}</span>
                <span style={styles.timestamp}>
                  {new Date(msg.sentAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
            aria-label="Message"
          />
          <button type="submit" style={styles.button} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>

        {error ? <p style={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '2rem',
    color: '#e2e8f0',
  },
  card: {
    width: '100%',
    maxWidth: '640px',
    backgroundColor: '#111827',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 20px 35px rgba(0,0,0,0.4)',
    border: '1px solid #1f2937',
  },
  heading: {
    margin: 0,
    marginBottom: '16px',
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center',
  },
  messages: {
    minHeight: '260px',
    maxHeight: '360px',
    overflowY: 'auto',
    padding: '12px',
    backgroundColor: '#0b1222',
    borderRadius: '12px',
    border: '1px solid #1f2937',
    marginBottom: '16px',
  },
  messageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '10px',
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    marginBottom: '8px',
    gap: '8px',
  },
  messageText: {
    fontWeight: 500,
    color: '#f8fafc',
  },
  timestamp: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    margin: '0.5rem 0',
  },
  form: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #1f2937',
    backgroundColor: '#0b1222',
    color: '#f8fafc',
    outline: 'none',
  },
  button: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#10b981',
    color: '#0b1120',
    fontWeight: 700,
    cursor: 'pointer',
  },
  error: {
    marginTop: '12px',
    color: '#f87171',
    textAlign: 'center',
  },
};
