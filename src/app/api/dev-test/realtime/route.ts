import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PulseStatus = 'blocked' | 'in-progress' | 'shipped';

type PulseItem = {
  id: string;
  title: string;
  status: PulseStatus;
  owner: string | null;
  updatedAt: number;
};

type Peer = {
  clientId: string;
  name: string | null;
  color: string;
};

type Client = {
  clientId: string;
  writer: WritableStreamDefaultWriter<string>;
  heartbeat: ReturnType<typeof setInterval>;
};

type ServerEvent =
  | { type: 'snapshot'; items: PulseItem[] }
  | { type: 'item'; item: PulseItem }
  | { type: 'presence'; peers: Peer[] };

const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#f59e0b', '#facc15', '#ef4444'];

const items = new Map<string, PulseItem>();
const clients = new Map<string, Client>();
const peers = new Map<string, Peer>();

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function colorForClient(clientId: string): string {
  let hash = 0;
  for (let index = 0; index < clientId.length; index += 1) {
    hash = (hash << 5) - hash + clientId.charCodeAt(index);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function broadcast(event: ServerEvent, excludeClientId?: string) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client, id) => {
    if (excludeClientId && excludeClientId === id) {
      return;
    }
    client.writer.write(payload).catch(() => {
      disconnect(id);
    });
  });
}

function disconnect(clientId: string) {
  const client = clients.get(clientId);
  if (!client) {
    return;
  }
  clearInterval(client.heartbeat);
  try {
    void client.writer.close();
  } catch {
    // ignore
  }
  clients.delete(clientId);
  peers.delete(clientId);
  broadcast({ type: 'presence', peers: Array.from(peers.values()) });
}

function snapshot(): PulseItem[] {
  return Array.from(items.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function bootOnce() {
  if (items.size > 0) {
    return;
  }
  const now = Date.now();
  const seed: Array<[string, PulseItem]> = [
    [
      generateId('pulse'),
      {
        id: '',
        title: 'Architect service boundaries',
        status: 'in-progress',
        owner: 'Jess',
        updatedAt: now - 1000 * 60 * 3,
      },
    ],
    [
      generateId('pulse'),
      {
        id: '',
        title: 'Wire realtime dashboards',
        status: 'blocked',
        owner: 'Taylor',
        updatedAt: now - 1000 * 60 * 7,
      },
    ],
    [
      generateId('pulse'),
      {
        id: '',
        title: 'Polish onboarding tour',
        status: 'shipped',
        owner: 'Sam',
        updatedAt: now - 1000 * 60 * 12,
      },
    ],
    [
      generateId('pulse'),
      {
        id: '',
        title: 'Benchmark production replicas',
        status: 'in-progress',
        owner: 'Dev',
        updatedAt: now - 1000 * 60 * 18,
      },
    ],
  ];
  seed.forEach(([id, payload]) => {
    const entry = { ...payload, id };
    items.set(id, entry);
  });
}

bootOnce();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const heartbeat = setInterval(() => {
    const client = clients.get(clientId);
    if (!client) {
      clearInterval(heartbeat);
      return;
    }
    client.writer.write(':ping\n\n').catch(() => {
      disconnect(clientId);
    });
  }, 25000);

  clients.set(clientId, { clientId, writer, heartbeat });

  const initial: ServerEvent = { type: 'snapshot', items: snapshot() };
  void writer.write(`data: ${JSON.stringify(initial)}\n\n`);
  broadcast({ type: 'presence', peers: Array.from(peers.values()) });

  request.signal.addEventListener('abort', () => {
    disconnect(clientId);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { type, clientId } = body as { type?: unknown; clientId?: unknown };

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  if (type === 'presence') {
    const { name } = body as { name?: unknown };
    const normalizedName = typeof name === 'string' ? name.trim().slice(0, 80) : null;
    peers.set(
      clientId,
      {
        clientId,
        name: normalizedName && normalizedName.length > 0 ? normalizedName : null,
        color: colorForClient(clientId),
      },
    );
    broadcast({ type: 'presence', peers: Array.from(peers.values()) });
    return NextResponse.json({ ok: true });
  }

  if (type === 'status') {
    const { itemId, status, owner } = body as { itemId?: unknown; status?: unknown; owner?: unknown };
    if (typeof itemId !== 'string' || !items.has(itemId)) {
      return NextResponse.json({ error: 'Unknown item' }, { status: 400 });
    }
    const normalizedStatus =
      status === 'blocked' || status === 'in-progress' || status === 'shipped' ? status : null;
    if (!normalizedStatus) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const normalizedOwner = typeof owner === 'string' ? owner.trim().slice(0, 80) : null;
    const entry = items.get(itemId)!;
    const updated: PulseItem = {
      ...entry,
      status: normalizedStatus,
      owner: normalizedOwner && normalizedOwner.length > 0 ? normalizedOwner : entry.owner,
      updatedAt: Date.now(),
    };
    items.set(itemId, updated);
    broadcast({ type: 'item', item: updated });
    return NextResponse.json({ ok: true });
  }

  if (type === 'create') {
    const { title, owner, status } = body as { title?: unknown; owner?: unknown; status?: unknown };
    if (typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const normalizedTitle = title.trim().slice(0, 160);
    if (normalizedTitle.length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const normalizedStatus =
      status === 'blocked' || status === 'in-progress' || status === 'shipped' ? status : 'in-progress';
    const normalizedOwner = typeof owner === 'string' ? owner.trim().slice(0, 80) : null;
    const id = generateId('pulse');
    const item: PulseItem = {
      id,
      title: normalizedTitle,
      status: normalizedStatus,
      owner: normalizedOwner && normalizedOwner.length > 0 ? normalizedOwner : null,
      updatedAt: Date.now(),
    };
    items.set(id, item);
    broadcast({ type: 'item', item });
    return NextResponse.json({ ok: true, id });
  }

  return NextResponse.json({ error: 'Unsupported command' }, { status: 400 });
}
