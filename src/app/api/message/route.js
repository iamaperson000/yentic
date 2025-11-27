import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

// Serverless API route to publish chat messages to Pusher Channels.
export async function POST(request) {
  try {
    const { message } = await request.json();
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Broadcast the message to the "chat" channel with a server-side timestamp.
    await pusherServer.trigger('chat', 'message', {
      message: trimmedMessage,
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to publish message', error);
    return NextResponse.json({ error: 'Failed to publish message' }, { status: 500 });
  }
}
