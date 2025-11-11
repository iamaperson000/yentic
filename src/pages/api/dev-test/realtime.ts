import { Buffer } from 'node:buffer';
import type { Server as HTTPServer } from 'node:http';
import type { Socket } from 'node:net';
import { Duplex } from 'node:stream';
import type { NextApiRequest, NextApiResponse } from 'next';
import ShareDB from 'sharedb';
import type { Doc, JSONOp } from 'sharedb';
import type WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import type { RawData } from 'ws';

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

const textDecoder = new TextDecoder();

const docReady: Promise<void> = new Promise((resolve, reject) => {
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

type JSONOpComponent = JSONOp[number];

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
      this.destroy(error as Error);
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
      this.isClosed = true;
      try {
        this.socket.close();
      } catch {
        // Ignore close errors
      }
    }
    callback();
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

function parseJSON(payload: RawData): unknown {
  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }

  if (Array.isArray(payload)) {
    const buffer = Buffer.concat(payload as Buffer[]);
    return parseJSON(buffer);
  }

  if (payload instanceof ArrayBuffer) {
    return JSON.parse(textDecoder.decode(payload));
  }

  if (ArrayBuffer.isView(payload)) {
    return JSON.parse(textDecoder.decode(payload));
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

type ServerWithRealtime = HTTPServer & {
  devTestRealtimeWss?: WebSocketServer;
};

function getOrCreateWebSocketServer(server: ServerWithRealtime): WebSocketServer {
  if (server.devTestRealtimeWss) {
    return server.devTestRealtimeWss;
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (socket, request) => {
    void handleConnection(socket, request.url ?? '/api/dev-test/realtime', request.headers.host ?? 'localhost');
  });

  server.devTestRealtimeWss = wss;
  return wss;
}

async function handleConnection(socket: WebSocket, requestUrl: string, host: string): Promise<void> {
  const url = new URL(requestUrl, `http://${host}`);
  const clientId = url.searchParams.get('clientId') ?? generateId('client');

  const stream = new ShareDBWebSocketStream(socket);

  try {
    await ensurePeer(clientId);
  } catch (error) {
    stream.destroy(error as Error);
    try {
      socket.close(1011, 'Failed to initialise peer');
    } catch {
      // ignore socket close errors
    }
    return;
  }

  backend.listen(stream);

  const cleanup = () => {
    void removePeer(clientId);
  };

  stream.on('close', cleanup);
  stream.on('error', cleanup);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function realtimeHandler(request: NextApiRequest, response: NextApiResponse): void {
  if (request.headers.upgrade?.toLowerCase() !== 'websocket') {
    response.status(426).setHeader('Connection', 'Upgrade');
    response.setHeader('Upgrade', 'websocket');
    response.send('Expected WebSocket upgrade');
    return;
  }

  const socket = request.socket;
  if (!socket) {
    response.status(500).end('Socket unavailable');
    return;
  }

  const nodeSocket = socket as Socket & { server?: HTTPServer };
  const server = nodeSocket.server as ServerWithRealtime | undefined;
  if (!server) {
    response.status(500).end('Server unavailable');
    return;
  }
  const wss = getOrCreateWebSocketServer(server);

  wss.handleUpgrade(request, nodeSocket, Buffer.alloc(0), ws => {
    wss.emit('connection', ws, request);
  });
}
