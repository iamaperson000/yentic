import { Duplex } from 'node:stream';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';

import type { NextApiRequest, NextApiResponse } from 'next';
import ShareDB from 'sharedb';
import type { Doc, JSONOp } from 'sharedb';
import WebSocket, { WebSocketServer } from 'ws';
import type { RawData } from 'ws';

type WebSocketServerInstance = InstanceType<typeof WebSocketServer>;

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

type RealtimeState = {
  backend: ShareDB;
  doc: Doc<PulseboardDoc>;
  ready: Promise<void>;
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: HttpServer & {
      devTestRealtime?: WebSocketServerInstance;
    };
  };
};

declare global {
  // eslint-disable-next-line no-var
  var devTestRealtimeState: RealtimeState | undefined;
}

const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#f59e0b', '#facc15', '#ef4444'];
const textDecoder = new TextDecoder();

function getRealtimeState(): RealtimeState {
  const globalScope = globalThis as typeof globalThis & {
    devTestRealtimeState?: RealtimeState;
  };

  if (!globalScope.devTestRealtimeState) {
    const backend = new ShareDB();
    const connection = backend.connect();
    const doc = connection.get<PulseboardDoc>('dev-test', 'pulseboard');

    const ready = new Promise<void>((resolve, reject) => {
      doc.subscribe(error => {
        if (error) {
          reject(error);
          return;
        }

        if (doc.type === null) {
          doc.create(buildInitialData(), 'json0', err => {
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

    globalScope.devTestRealtimeState = { backend, doc, ready };
  }

  return globalScope.devTestRealtimeState;
}

class ShareDBWebSocketStream extends Duplex {
  private socket: WebSocket;

  private isClosed = false;

  constructor(socket: WebSocket) {
    super({ objectMode: true });
    this.socket = socket;

    socket.on('message', data => {
      if (this.isClosed) {
        return;
      }
      this.handleIncomingMessage(data);
    });

    socket.on('close', () => {
      if (this.isClosed) {
        return;
      }
      this.isClosed = true;
      this.push(null);
      this.emit('close');
    });

    socket.on('error', error => {
      if (this.isClosed) {
        return;
      }
      this.isClosed = true;
      this.destroy(error instanceof Error ? error : new Error('WebSocket error'));
    });
  }

  _read(): void {
    // Intentionally empty; backpressure is managed by ShareDB.
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
        // Ignore close errors on shutdown.
      }
      this.isClosed = true;
    }
    callback();
  }

  override destroy(error?: Error): this {
    if (!this.isClosed) {
      try {
        this.socket.close();
      } catch {
        // Ignore additional close errors.
      }
      this.isClosed = true;
    }
    return super.destroy(error);
  }

  private handleIncomingMessage(payload: RawData): void {
    try {
      const data = parseJSON(payload);
      if (data !== undefined) {
        this.push(data);
      }
    } catch (error) {
      this.destroy(error as Error);
    }
  }
}

function parseJSON(payload: RawData | unknown): unknown {
  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }

  if (payload instanceof ArrayBuffer) {
    return JSON.parse(textDecoder.decode(payload));
  }

  if (ArrayBuffer.isView(payload)) {
    return JSON.parse(textDecoder.decode(payload));
  }

  if (typeof Buffer !== 'undefined') {
    if (Buffer.isBuffer(payload)) {
      return JSON.parse(payload.toString('utf8'));
    }

    if (Array.isArray(payload) && payload.every(Buffer.isBuffer)) {
      return JSON.parse(Buffer.concat(payload).toString('utf8'));
    }
  }

  return undefined;
}

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // Ignore and fall back to Math.random-based id.
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
  const { doc, ready } = getRealtimeState();
  await ready;
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
    (op[0] as JSONOp[number]).od = current;
  }

  await submitOp(doc, op, { source: 'server:peer:ensure' });
}

async function removePeer(clientId: string): Promise<void> {
  const { doc, ready } = getRealtimeState();
  await ready;
  const existing = doc.data?.peers?.[clientId];
  if (!existing) {
    return;
  }
  await submitOp(
    doc,
    [
      {
        p: ['peers', clientId],
        od: existing,
      },
    ],
    { source: 'server:peer:remove' },
  );
}

function submitOp(targetDoc: Doc<PulseboardDoc>, op: JSONOp, options: SubmitOptions): Promise<void> {
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

function ensureWebSocketServer(res: NextApiResponseWithSocket): WebSocketServerInstance {
  const server = res.socket.server;
  if (server.devTestRealtime) {
    return server.devTestRealtime;
  }

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/api/dev-test/realtime')) {
      return;
    }

    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket, request) => {
    handleConnection(socket, request);
  });

  server.devTestRealtime = wss;
  return wss;
}

function handleConnection(socket: WebSocket, request: IncomingMessage): void {
  const { backend } = getRealtimeState();
  const url = new URL(request.url ?? '', 'http://localhost');
  const clientId = url.searchParams.get('clientId') ?? generateId('client');

  const stream = new ShareDBWebSocketStream(socket);

  (async () => {
    try {
      await ensurePeer(clientId);
    } catch (error) {
      stream.destroy(error as Error);
      return;
    }

    backend.listen(stream);

    stream.on('close', () => {
      void removePeer(clientId);
    });

    stream.on('error', () => {
      void removePeer(clientId);
    });
  })().catch(error => {
    stream.destroy(error as Error);
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(_req: NextApiRequest, res: NextApiResponseWithSocket): void {
  if (!res.socket?.server) {
    res.status(500).end('Expected Node.js runtime with HTTP server');
    return;
  }

  ensureWebSocketServer(res);
  res.status(200).end('Realtime server ready');
}
