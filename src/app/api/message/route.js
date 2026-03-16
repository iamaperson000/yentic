import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

const RATE_LIMIT_WINDOW_MS = 15_000;
const RATE_LIMIT_MAX_MESSAGES = 5;
const MAX_MESSAGE_LENGTH = 800;
const REQUIRED_PUSHER_ENV = [
  'PUSHER_APP_ID',
  'PUSHER_SECRET',
  'PUSHER_CLUSTER',
  'NEXT_PUBLIC_PUSHER_KEY',
  'NEXT_PUBLIC_PUSHER_CLUSTER',
];
const rateLimitStore =
  globalThis.__yenticChatRateLimit ??
  (globalThis.__yenticChatRateLimit = new Map());

function isRateLimited(key) {
  const now = Date.now();
  const recent = (rateLimitStore.get(key) ?? []).filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_MESSAGES) {
    rateLimitStore.set(key, recent);
    return true;
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return false;
}

// Serverless API route to publish chat messages to Pusher Channels.
export async function POST(request) {
  try {
    const missingEnv = REQUIRED_PUSHER_ENV.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: 'Chat is not configured on this deployment.' },
        { status: 503 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Sign in to send messages' }, { status: 401 });
    }

    if (isRateLimited(session.user.email)) {
      return NextResponse.json({ error: 'You are sending messages too quickly' }, { status: 429 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { message } = payload;
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    // Broadcast the message to the "chat" channel with a server-side timestamp.
    await pusherServer.trigger('chat', 'message', {
      message: trimmedMessage,
      sender:
        session.user.name ||
        session.user.username ||
        session.user.email.split('@')[0],
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to publish message', error);
    return NextResponse.json({ error: 'Failed to publish message' }, { status: 500 });
  }
}
