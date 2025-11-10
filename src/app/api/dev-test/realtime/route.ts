import { Duplex } from 'node:stream';
import ShareDB from 'sharedb';
import type { Doc, JSONOp } from 'sharedb';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ConnectionStateDoc = Doc<PulseboardDoc>;

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

type PulseboardDoc = {
  items: Record<string, PulseItem>;
  peers: Record<string, Peer>;
};

type SubmitOptions = { source?: unknown };

const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#f59e0b', '#facc15', '#ef4444'];

const backend = new ShareDB();
const connection = backend.connect();
const doc = connection.get<PulseboardDoc>('dev-test', 'pulseboard');

const docReady: Promise<void> = new Promise((resolve, reject) => {
  doc.subscribe(error => {
    if (error) {
      reject(error);
      return;
    }
    if (doc.type === null) {
      doc.create(buildInitialData(), err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
      return;
    }
    resolve();
  });
});

type JSONOpComponent = JSONOp[number];

class ShareDBWebSocketStream extends Duplex {
  private socket: WebSocket;
  private isClosed = false;

  constructor(socket: WebSocket) {
    super({ objectMode: true });
    this.socket = socket;

    socket.addEventListener('message', event => {
      if (this.isClosed) {
        return;
      }
      try {
        const data = parseJSON(event.data);
        if (data !== undefined) {
          this.push(data);
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    });

    socket.addEventListener('close', () => {
      if (this.isClosed) {
        return;
      }
      this.isClosed = true;
      this.push(null);
      this.emit('close');
    });

    socket.addEventListener('error', () => {
      if (this.isClosed) {
        return;
      }
      this.isClosed = true;
      this.destroy(new Error('WebSocket error'));
    });
  }

  _read(): void {
    // No-op: pushes happen from WebSocket messages
  }

  _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (this.isClosed) {
      callback();
      return;
    }
    try {
      this.socket.send(JSON.stringify(chunk));
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    if (!this.isClosed) {
      try {
        this.socket.close();
      } catch {
        // Ignore close errors
      }
      this.isClosed = true;
    }
    callback();
  }
}

function parseJSON(payload: unknown): unknown {
  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }
  if (payload instanceof ArrayBuffer) {
    const textDecoder = new TextDecoder();
    return JSON.parse(textDecoder.decode(payload));
  }
  if (typeof Blob !== 'undefined' && payload instanceof Blob) {
    return undefined;
  }
  return undefined;
}

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

function buildInitialData(): PulseboardDoc {
  const now = Date.now();
  const base: Array<Omit<PulseItem, 'id'>> = [
    {
      title: 'Architect service boundaries',
      status: 'in-progress',
      owner: 'Jess',
      updatedAt: now - 1000 * 60 * 3,
    },
    {
      title: 'Wire realtime dashboards',
      status: 'blocked',
      owner: 'Taylor',
      updatedAt: now - 1000 * 60 * 7,
    },
    {
      title: 'Polish onboarding tour',
      status: 'shipped',
      owner: 'Sam',
      updatedAt: now - 1000 * 60 * 12,
    },
    {
      title: 'Benchmark production replicas',
      status: 'in-progress',
      owner: 'Dev',
      updatedAt: now - 1000 * 60 * 18,
    },
  ];

  const items: Record<string, PulseItem> = {};
  base.forEach(entry => {
    const id = generateId('pulse');
    items[id] = { ...entry, id };
  });

  return {
    items,
    peers: {},
  };
}

async function ensurePeer(clientId: string): Promise<void> {
  await docReady;
  const current = doc.data?.peers?.[clientId];
  const peer: Peer = {
    clientId,
    name: current?.name ?? null,
    color: colorForClient(clientId),
  };

  const op: JSONOp = [
    {
      p: ['peers', clientId],
      oi: peer,
    },
  ];

  if (current) {
    (op[0] as JSONOpComponent).od = current;
  }

  await submitOp(doc, op, { source: 'server:peer:ensure' });
}

async function removePeer(clientId: string): Promise<void> {
  await docReady;
  const existing = doc.data?.peers?.[clientId];
  if (!existing) {
    return;
  }
  await submitOp(doc, [
    {
      p: ['peers', clientId],
      od: existing,
    },
  ], { source: 'server:peer:remove' });
}

function submitOp(targetDoc: ConnectionStateDoc, op: JSONOp, options: SubmitOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    targetDoc.submitOp(op, options, error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function GET(request: NextRequest) {
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') ?? generateId('client');

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

  const stream = new ShareDBWebSocketStream(serverSocket);

  try {
    await ensurePeer(clientId);
  } catch (error) {
    stream.destroy(error as Error);
    return new Response('Failed to initialise peer', { status: 500 });
  }

  backend.listen(stream);

  stream.on('close', () => {
    void removePeer(clientId);
  });

  stream.on('error', () => {
    void removePeer(clientId);
  });

  return new Response(null, {
    status: 101,
    webSocket: clientSocket,
  } as ResponseInit & { webSocket: WebSocket });
}
