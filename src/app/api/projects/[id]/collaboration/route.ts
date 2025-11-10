import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
  lastSeen: number;
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

type AuthorizationResult =
  | { kind: 'authorized'; userId: string; role: 'owner' | 'editor' | 'viewer' }
  | { kind: 'unauthorized'; status: 401 | 403 | 404 };

async function authorize(projectId: string): Promise<AuthorizationResult> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return { kind: 'unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { kind: 'unauthorized', status: 401 };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      collaborators: {
        select: { userId: true, role: true },
      },
    },
  });

  if (!project) {
    return { kind: 'unauthorized', status: 404 };
  }

  if (project.userId === user.id) {
    return { kind: 'authorized', userId: user.id, role: 'owner' };
  }

  const membership = project.collaborators.find(entry => entry.userId === user.id);

  if (!membership) {
    return { kind: 'unauthorized', status: 403 };
  }

  const role = membership.role === 'editor' ? 'editor' : 'viewer';
  return { kind: 'authorized', userId: user.id, role };
}

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

  const auth = await authorize(projectId);
  if (auth.kind === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  let room = rooms.get(projectId);
  if (!room) {
    room = new Map();
    rooms.set(projectId, room);
  }

  const existing = room.get(clientId);
  if (existing) {
    clearInterval(existing.keepAliveTimer);
    try {
      void existing.writer.close();
    } catch {
      // ignore
    }
    room.delete(clientId);
  }

  const keepAliveTimer = setInterval(() => {
    const currentRoom = rooms.get(projectId);
    const currentClient = currentRoom?.get(clientId);
    if (!currentRoom || !currentClient) {
      clearInterval(keepAliveTimer);
      return;
    }
    if (Date.now() - currentClient.lastSeen > 45000) {
      cleanupClient(projectId, clientId);
      return;
    }
    writer.write(':keep-alive\n\n').catch(() => {
      cleanupClient(projectId, clientId);
    });
  }, 30000);

  const client: RoomClient = {
    clientId,
    writer,
    presence: null,
    keepAliveTimer,
    lastSeen: Date.now(),
  };

  room.set(clientId, client);

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

  const auth = await authorize(projectId);
  if (auth.kind === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const room = rooms.get(projectId);
  if (!room || !room.has(clientId)) {
    return NextResponse.json({ ok: true });
  }

  const client = room.get(clientId);
  if (client) {
    client.lastSeen = Date.now();
  }

  if (type === 'update') {
    if (auth.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (typeof update !== 'string' || update.length === 0) {
      return NextResponse.json({ error: 'Missing update payload' }, { status: 400 });
    }
    broadcast(projectId, { type: 'update', update, clientId }, clientId);
    return NextResponse.json({ ok: true });
  }

  if (type === 'presence') {
    const client = room.get(clientId);
    if (client) {
      if (presence === null) {
        cleanupClient(projectId, clientId);
        return NextResponse.json({ ok: true });
      }
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
