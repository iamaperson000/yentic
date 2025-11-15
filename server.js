/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production-ready Socket.IO realtime server configured for Railway deployment.
 *
 * Features
 * - Express HTTP server with health check and robust CORS configuration
 * - Socket.IO namespace for chat traffic with room management abstraction
 * - Automatic room lifecycle handling with duplicate join protection
 * - Placeholder authorization hook for future extension
 * - Extensive logging to aid observability in distributed environments
 *
 * Environment variables
 * - PORT: port to bind the HTTP server (defaults to 3001)
 * - CORS_ORIGINS: optional comma-separated allowlist of origins (defaults to "*")
 * - SOCKET_AUTH_TOKEN: optional token that clients must provide to connect
 */

const http = require('node:http');
const process = require('node:process');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');

const DEFAULT_PORT = 3001;
const PORT = Number.parseInt(process.env.PORT, 10) || DEFAULT_PORT;
const RAW_ALLOWED_ORIGINS = process.env.CORS_ORIGINS;

// Normalize the allowlist into a Set for quick membership tests.
const ALLOWED_ORIGINS = new Set(
  (RAW_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
);

const allowAllOrigins = ALLOWED_ORIGINS.size === 0;

const app = express();

function logLifecycle(message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const formattedMetadata = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
  console.info(`[${timestamp}] ${message}${formattedMetadata}`);
}

// Minimal but robust CORS middleware so deployments do not require an extra dependency.
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (allowAllOrigins) {
    if (requestOrigin) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  }

  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Socket-Token',
  );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const httpServer = http.createServer(app);

function originValidator(origin, callback) {
  if (!origin || allowAllOrigins || ALLOWED_ORIGINS.has(origin)) {
    callback(null, true);
    return;
  }

  logLifecycle('Rejected connection due to origin policy', { origin });
  callback(new Error('CORS_ORIGIN_NOT_ALLOWED'));
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: originValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Socket-Token'],
  },
  serveClient: false,
});

// Room manager encapsulates per-room state and participant tracking.
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { createdAt, participants: Map<socketId, Participant> }
    this.membership = new Map(); // socketId -> Set<roomId>
  }

  ensureRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        createdAt: new Date().toISOString(),
        participants: new Map(),
      });
    }

    return this.rooms.get(roomId);
  }

  join(roomId, socketId, participant) {
    const room = this.ensureRoom(roomId);
    const participantSet = room.participants;

    if (participantSet.has(socketId)) {
      return { alreadyJoined: true, room, participant: participantSet.get(socketId) };
    }

    participantSet.set(socketId, participant);

    if (!this.membership.has(socketId)) {
      this.membership.set(socketId, new Set());
    }
    this.membership.get(socketId).add(roomId);

    return { alreadyJoined: false, room, participant };
  }

  leave(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { existed: false, remaining: 0 };
    }

    room.participants.delete(socketId);

    const roomsForSocket = this.membership.get(socketId);
    if (roomsForSocket) {
      roomsForSocket.delete(roomId);
      if (roomsForSocket.size === 0) {
        this.membership.delete(socketId);
      }
    }

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      return { existed: true, remaining: 0, deleted: true };
    }

    return { existed: true, remaining: room.participants.size, deleted: false };
  }

  leaveAll(socketId) {
    const roomsForSocket = this.membership.get(socketId);
    if (!roomsForSocket) {
      return [];
    }

    const results = [];
    for (const roomId of roomsForSocket) {
      results.push({ roomId, ...this.leave(roomId, socketId) });
    }

    return results;
  }

  getParticipants(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }

    return Array.from(room.participants.values());
  }

  getRoomsForSocket(socketId) {
    return Array.from(this.membership.get(socketId) || []);
  }
}

const roomManager = new RoomManager();

function isAuthorized(socket) {
  const requiredToken = process.env.SOCKET_AUTH_TOKEN;
  if (!requiredToken) {
    return true;
  }

  const providedToken = socket.handshake?.auth?.token || socket.handshake?.headers?.['x-socket-token'];
  return providedToken === requiredToken;
}

const CHAT_NAMESPACE = '/chat';
const chatNamespace = io.of(CHAT_NAMESPACE);

chatNamespace.use((socket, next) => {
  if (!isAuthorized(socket)) {
    logLifecycle('Unauthorized connection attempt', {
      socketId: socket.id,
      namespace: socket.nsp?.name,
      ip: socket.handshake?.address,
    });
    next(new Error('UNAUTHORIZED'));
    return;
  }

  next();
});

chatNamespace.on('connection', socket => {
  logLifecycle('Socket connected', {
    socketId: socket.id,
    namespace: socket.nsp.name,
    recovered: Boolean(socket.recovered),
    transport: socket.conn.transport.name,
  });

  socket.on('join-room', (payload = {}, ack) => {
    const { sessionId, userId, displayName } = payload;

    if (!sessionId || typeof sessionId !== 'string') {
      const error = { code: 'ROOM_ID_REQUIRED', message: 'A sessionId is required to join a room.' };
      socket.emit('room-error', error);
      if (typeof ack === 'function') ack({ ok: false, error });
      return;
    }

    const participant = {
      socketId: socket.id,
      userId: userId || socket.id,
      displayName: displayName || `Guest-${socket.id.slice(-4)}`,
      lastSeenAt: new Date().toISOString(),
    };

    const { alreadyJoined } = roomManager.join(sessionId, socket.id, participant);
    socket.join(sessionId);

    const presence = roomManager.getParticipants(sessionId);
    chatNamespace.to(sessionId).emit('presence-update', { roomId: sessionId, participants: presence });

    if (alreadyJoined) {
      logLifecycle('Duplicate room join ignored', { socketId: socket.id, sessionId });
    } else {
      logLifecycle('Socket joined room', { socketId: socket.id, sessionId, occupancy: presence.length });
    }

    socket.emit('room-joined', { roomId: sessionId, participants: presence, alreadyJoined });
    if (typeof ack === 'function') ack({ ok: true, roomId: sessionId, participants: presence, alreadyJoined });
  });

  socket.on('leave-room', (payload = {}, ack) => {
    const { sessionId } = payload;
    if (!sessionId || typeof sessionId !== 'string') {
      const error = { code: 'ROOM_ID_REQUIRED', message: 'A sessionId is required to leave a room.' };
      socket.emit('room-error', error);
      if (typeof ack === 'function') ack({ ok: false, error });
      return;
    }

    socket.leave(sessionId);
    const result = roomManager.leave(sessionId, socket.id);
    const presence = roomManager.getParticipants(sessionId);
    chatNamespace.to(sessionId).emit('presence-update', { roomId: sessionId, participants: presence });

    logLifecycle('Socket left room', { socketId: socket.id, sessionId, remaining: result.remaining });

    socket.emit('room-left', { roomId: sessionId });
    if (typeof ack === 'function') ack({ ok: true, roomId: sessionId });
  });

  socket.on('send-message', (payload = {}, ack) => {
    const { sessionId, message } = payload;
    if (!sessionId || typeof sessionId !== 'string') {
      const error = { code: 'ROOM_ID_REQUIRED', message: 'A sessionId is required to send a message.' };
      socket.emit('room-error', error);
      if (typeof ack === 'function') ack({ ok: false, error });
      return;
    }

    if (!message || typeof message.text !== 'string' || !message.text.trim()) {
      const error = { code: 'MESSAGE_REQUIRED', message: 'A non-empty text message is required.' };
      if (typeof ack === 'function') ack({ ok: false, error });
      return;
    }

    const trimmedText = message.text.trim();
    const outgoing = {
      id: message.id || `${socket.id}-${Date.now()}`,
      text: trimmedText,
      roomId: sessionId,
      userId: message.userId || socket.id,
      displayName: message.displayName || message.userId || socket.id,
      sentAt: new Date().toISOString(),
    };

    chatNamespace.to(sessionId).emit('message', outgoing);
    logLifecycle('Message broadcast', { sessionId, socketId: socket.id, messageId: outgoing.id });

    if (typeof ack === 'function') ack({ ok: true, message: outgoing });
  });

  socket.on('typing', (payload = {}) => {
    const { sessionId, isTyping = true, userId, displayName } = payload;
    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('room-error', { code: 'ROOM_ID_REQUIRED', message: 'Cannot emit typing without sessionId.' });
      return;
    }

    socket.to(sessionId).emit('typing', {
      roomId: sessionId,
      userId: userId || socket.id,
      displayName: displayName || userId || socket.id,
      isTyping: Boolean(isTyping),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('presence-update', (payload = {}) => {
    const { sessionId, status } = payload;
    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('room-error', { code: 'ROOM_ID_REQUIRED', message: 'Cannot update presence without sessionId.' });
      return;
    }

    const participant = roomManager.ensureRoom(sessionId).participants.get(socket.id);
    if (participant) {
      participant.status = status || 'online';
      participant.lastSeenAt = new Date().toISOString();
    }

    const presence = roomManager.getParticipants(sessionId);
    chatNamespace.to(sessionId).emit('presence-update', { roomId: sessionId, participants: presence });
    logLifecycle('Presence update broadcast', { sessionId, socketId: socket.id, status: participant?.status });
  });

  socket.on('client-reconnecting', (payload = {}) => {
    const { sessionId } = payload;
    logLifecycle('Client attempting to reconnect', { socketId: socket.id, sessionId });
  });

  socket.on('disconnecting', reason => {
    const rooms = roomManager.getRoomsForSocket(socket.id);
    for (const roomId of rooms) {
      socket.to(roomId).emit('presence-update', {
        roomId,
        participants: roomManager.getParticipants(roomId).filter(p => p.socketId !== socket.id),
      });
    }
    logLifecycle('Socket disconnecting', { socketId: socket.id, reason, rooms });
  });

  socket.on('disconnect', reason => {
    const cleanupResults = roomManager.leaveAll(socket.id);
    logLifecycle('Socket disconnected', { socketId: socket.id, reason, cleanupResults });
  });

  socket.on('error', error => {
    logLifecycle('Socket error', { socketId: socket.id, error: error?.message || String(error) });
  });
});

httpServer.listen(PORT, () => {
  logLifecycle('Realtime server listening', {
    port: PORT,
    allowAllOrigins,
    allowedOrigins: Array.from(ALLOWED_ORIGINS.values()),
  });
});

module.exports = { httpServer, io };
