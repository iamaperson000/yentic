import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PresenceState = {
  id: string;
  name: string | null;
  color: string;
  avatar: string | null;
};

type RoomClient = {
  clientId: string;
  writer: WritableStreamDefaultWriter<string>;
  presence: PresenceState | null;
  keepAliveTimer: ReturnType<typeof setInterval>;
};

type ServerPresenceEntry = {
  clientId: string;
  userId: string | null;
  name: string | null;
  color: string | null;
  avatar: string | null;
};

type ServerMessage =
  | { type: 'update'; update: string; clientId: string }
  | { type: 'presence'; clients: ServerPresenceEntry[] };

const rooms = new Map<string, Map<string, RoomClient>>();

function serializePresence(room: Map<string, RoomClient>): ServerPresenceEntry[] {
  return Array.from(room.values()).map(client => ({
    clientId: client.clientId,
    userId: client.presence?.id ?? null,
    name: client.presence?.name ?? null,
    color: client.presence?.color ?? null,
    avatar: client.presence?.avatar ?? null,
  }));
}

function broadcast(roomId: string, message: ServerMessage, excludeClientId?: string) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  room.forEach((client, id) => {
    if (excludeClientId && id === excludeClientId) {
      return;
    }
    client.writer.write(payload).catch(() => {
      cleanupClient(roomId, id);
    });
  });
}

function broadcastPresence(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  broadcast(roomId, { type: 'presence', clients: serializePresence(room) });
}

function cleanupClient(roomId: string, clientId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  const client = room.get(clientId);
  if (!client) {
    return;
  }
  clearInterval(client.keepAliveTimer);
  try {
    void client.writer.close();
  } catch {
    // ignore close errors
  }
  room.delete(clientId);
  if (room.size === 0) {
    rooms.delete(roomId);
    return;
  }
  broadcastPresence(roomId);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const projectId = params.id;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  let room = rooms.get(projectId);
  if (!room) {
    room = new Map();
    rooms.set(projectId, room);
  }

  const keepAliveTimer = setInterval(() => {
    writer.write(':keep-alive\n\n').catch(() => {
      cleanupClient(projectId, clientId);
    });
  }, 30000);

  room.set(clientId, {
    clientId,
    writer,
    presence: null,
    keepAliveTimer,
  });

  const initialPresence = { type: 'presence' as const, clients: serializePresence(room) };
  void writer.write(`data: ${JSON.stringify(initialPresence)}\n\n`);
  broadcastPresence(projectId);

  request.signal.addEventListener('abort', () => {
    cleanupClient(projectId, clientId);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const projectId = params.id;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { type, clientId, update, presence } = body as {
    type?: unknown;
    clientId?: unknown;
    update?: unknown;
    presence?: unknown;
  };

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const room = rooms.get(projectId);
  if (!room || !room.has(clientId)) {
    return NextResponse.json({ ok: true });
  }

  if (type === 'update') {
    if (typeof update !== 'string' || update.length === 0) {
      return NextResponse.json({ error: 'Missing update payload' }, { status: 400 });
    }
    broadcast(projectId, { type: 'update', update, clientId }, clientId);
    return NextResponse.json({ ok: true });
  }

  if (type === 'presence') {
    const client = room.get(clientId);
    if (client) {
      if (
        presence &&
        typeof presence === 'object' &&
        typeof (presence as { id?: unknown }).id === 'string' &&
        (presence as { id: string }).id.trim().length > 0 &&
        typeof (presence as { color?: unknown }).color === 'string'
      ) {
        client.presence = {
          id: (presence as { id: string }).id,
          name:
            typeof (presence as { name?: unknown }).name === 'string'
              ? (presence as { name: string }).name
              : null,
          color: (presence as { color: string }).color,
          avatar:
            typeof (presence as { avatar?: unknown }).avatar === 'string'
              ? ((presence as { avatar: string }).avatar.length > 0
                  ? (presence as { avatar: string }).avatar
                  : null)
              : null,
        };
      } else {
        client.presence = null;
      }
    }
    broadcastPresence(projectId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported command' }, { status: 400 });
}
