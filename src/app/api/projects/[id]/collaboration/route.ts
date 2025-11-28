import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const STALE_THRESHOLD_MS = 60_000;

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
  presence: PresenceState | null;
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

type AuthorizationResult =
  | { kind: 'authorized'; userId: string; role: 'owner' | 'editor' | 'viewer' }
  | { kind: 'unauthorized'; status: 401 | 403 | 404 };

const rooms = new Map<string, Map<string, RoomClient>>();

function channelName(projectId: string) {
  return `project-${projectId}`;
}

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

function getRoom(projectId: string): Map<string, RoomClient> {
  let room = rooms.get(projectId);
  if (!room) {
    room = new Map();
    rooms.set(projectId, room);
  }
  pruneRoom(projectId);
  return room;
}

function pruneRoom(projectId: string) {
  const room = rooms.get(projectId);
  if (!room) {
    return;
  }
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  room.forEach((client, id) => {
    if (client.lastSeen < cutoff) {
      room.delete(id);
    }
  });
  if (room.size === 0) {
    rooms.delete(projectId);
  }
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

async function broadcast(projectId: string, message: ServerMessage) {
  try {
    await pusherServer.trigger(channelName(projectId), message.type, message as never);
  } catch (error) {
    console.error('[collaboration] Failed to trigger Pusher event', error);
  }
}

async function broadcastPresence(projectId: string) {
  const room = rooms.get(projectId);
  if (!room) {
    return;
  }
  pruneRoom(projectId);
  await broadcast(projectId, { type: 'presence', clients: serializePresence(room) });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const projectId = params.id;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  const auth = await authorize(projectId);
  if (auth.kind === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const room = getRoom(projectId);
  if (clientId) {
    const entry = room.get(clientId) ?? { clientId, presence: null, lastSeen: Date.now() };
    entry.lastSeen = Date.now();
    room.set(clientId, entry);
  }

  return NextResponse.json({ clients: serializePresence(room) });
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

  const room = getRoom(projectId);
  const client: RoomClient = room.get(clientId) ?? { clientId, presence: null, lastSeen: Date.now() };
  client.lastSeen = Date.now();
  room.set(clientId, client);

  if (type === 'update') {
    if (auth.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (typeof update !== 'string' || update.length === 0) {
      return NextResponse.json({ error: 'Missing update payload' }, { status: 400 });
    }
    await broadcast(projectId, { type: 'update', update, clientId });
    return NextResponse.json({ ok: true });
  }

  if (type === 'presence') {
    if (presence === null) {
      room.delete(clientId);
      await broadcastPresence(projectId);
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
        name: typeof (presence as { name?: unknown }).name === 'string' ? (presence as { name: string }).name : null,
        color: (presence as { color: string }).color,
        avatar:
          typeof (presence as { avatar?: unknown }).avatar === 'string'
            ? (presence as { avatar: string }).avatar.length > 0
              ? (presence as { avatar: string }).avatar
              : null
            : null,
      };
    } else {
      client.presence = null;
    }
    room.set(clientId, client);
    await broadcastPresence(projectId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported command' }, { status: 400 });
}
