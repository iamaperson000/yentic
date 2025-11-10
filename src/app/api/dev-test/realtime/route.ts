import { NextRequest } from 'next/server';

export const runtime = 'edge';
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

type ServerEvent =
  | { type: 'snapshot'; items: PulseItem[] }
  | { type: 'item'; item: PulseItem }
  | { type: 'presence'; peers: Peer[] };

const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#f59e0b', '#facc15', '#ef4444'];

const items = new Map<string, PulseItem>();
const clients = new Map<string, WebSocket>();
const peers = new Map<string, Peer>();

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // ignore and fall back to Math.random
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

function snapshot(): PulseItem[] {
  return Array.from(items.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function broadcast(event: ServerEvent, excludeClientId?: string) {
  const payload = JSON.stringify(event);
  clients.forEach((socket, id) => {
    if (excludeClientId && excludeClientId === id) {
      return;
    }
    try {
      socket.send(payload);
    } catch {
      removeClient(id, socket);
    }
  });
}

function broadcastPresence() {
  broadcast({ type: 'presence', peers: Array.from(peers.values()) });
}

function removeClient(clientId: string, socket: WebSocket) {
  const current = clients.get(clientId);
  if (!current || current !== socket) {
    return;
  }
  clients.delete(clientId);
  peers.delete(clientId);
  broadcastPresence();
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
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') ?? generateId('client');

  const previousPeer = peers.get(clientId);
  const existing = clients.get(clientId);
  if (existing) {
    try {
      existing.close(4000, 'Reconnected');
    } catch {
      // ignore close errors
    }
    clients.delete(clientId);
    peers.delete(clientId);
  }

  const { WebSocketPair } = globalThis as typeof globalThis & {
    WebSocketPair?: new () => { 0: WebSocket; 1: WebSocket };
  };
  if (!WebSocketPair) {
    return new Response('WebSocketPair not supported in this environment', { status: 500 });
  }
  const pair = new WebSocketPair();
  const clientSocket = pair[0];
  const serverSocket = pair[1];
  (serverSocket as unknown as { accept: () => void }).accept();

  clients.set(clientId, serverSocket);
  peers.set(clientId, {
    clientId,
    name: previousPeer?.name ?? null,
    color: colorForClient(clientId),
  });

  try {
    serverSocket.send(JSON.stringify({ type: 'snapshot', items: snapshot() }));
  } catch {
    // ignore send errors on initial payload
  }

  broadcastPresence();

  serverSocket.addEventListener('message', event => {
    if (typeof event.data !== 'string') {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') {
      return;
    }
    const { type } = parsed as { type?: unknown };
    if (type === 'presence') {
      const { name } = parsed as { name?: unknown };
      const normalized = typeof name === 'string' ? name.trim().slice(0, 80) : null;
      peers.set(clientId, {
        clientId,
        name: normalized && normalized.length > 0 ? normalized : null,
        color: colorForClient(clientId),
      });
      broadcastPresence();
      return;
    }
    if (type === 'status') {
      const { itemId, status, owner } = parsed as {
        itemId?: unknown;
        status?: unknown;
        owner?: unknown;
      };
      if (typeof itemId !== 'string') {
        return;
      }
      const entry = items.get(itemId);
      if (!entry) {
        return;
      }
      const normalizedStatus =
        status === 'blocked' || status === 'in-progress' || status === 'shipped' ? status : null;
      if (!normalizedStatus) {
        return;
      }
      const normalizedOwner = typeof owner === 'string' ? owner.trim().slice(0, 80) : null;
      const updated: PulseItem = {
        ...entry,
        status: normalizedStatus,
        owner: normalizedOwner && normalizedOwner.length > 0 ? normalizedOwner : entry.owner,
        updatedAt: Date.now(),
      };
      items.set(itemId, updated);
      broadcast({ type: 'item', item: updated });
      return;
    }
    if (type === 'create') {
      const { title, owner, status } = parsed as {
        title?: unknown;
        owner?: unknown;
        status?: unknown;
      };
      if (typeof title !== 'string') {
        return;
      }
      const normalizedTitle = title.trim().slice(0, 160);
      if (normalizedTitle.length === 0) {
        return;
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
    }
  });

  const handleDisconnect = () => {
    removeClient(clientId, serverSocket);
  };

  serverSocket.addEventListener('close', handleDisconnect);
  serverSocket.addEventListener('error', handleDisconnect);

  return new Response(null, {
    status: 101,
    webSocket: clientSocket,
  } as ResponseInit & { webSocket: WebSocket });
}
