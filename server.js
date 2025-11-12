/**
 * Collaborative chatroom demo server.
 *
 * How to run:
 *   1. npm install
 *   2. npm run dev            # development with hot reload
 *      or npm run build && npm run start for production mode
 *   3. Visit http://localhost:3000/chat to open the OT playground
 */

const http = require('node:http');
const path = require('node:path');

const express = require('express');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { TextOperation, Server: OTServer } = require('ot');

const PORT = Number(process.env.PORT) || 3000;
const INITIAL_DOCUMENT = 'Welcome to the collaborative chatroom!\n\nShare a link with a teammate and start editing together in real time.';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#facc15', '#f472b6', '#fbbf24'];
let paletteIndex = 0;

function assignColor() {
  const color = palette[paletteIndex % palette.length];
  paletteIndex += 1;
  return color;
}

function sanitizeName(name) {
  if (typeof name !== 'string') {
    return '';
  }
  return name.trim().slice(0, 32);
}

function safeName(name, fallback) {
  const trimmed = sanitizeName(name);
  return trimmed.length > 0 ? trimmed : fallback;
}

function buildUserSnapshot(clients) {
  return Array.from(clients.values()).map(client => ({
    id: client.id,
    name: client.name,
    color: client.color,
  }));
}

function timestamp() {
  return Date.now();
}

nextApp
  .prepare()
  .then(() => {
    const app = express();
    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
    });

    const otServer = new OTServer(INITIAL_DOCUMENT);
    const clients = new Map();

    function emitUserList() {
      const snapshot = buildUserSnapshot(clients);
      io.emit('users', snapshot);
    }

    function emitLog(message, user) {
      io.emit('log', {
        message,
        timestamp: timestamp(),
        user,
      });
    }

    io.on('connection', socket => {
      const user = {
        id: socket.id,
        name: `Guest ${socket.id.slice(-4)}`,
        color: assignColor(),
      };
      clients.set(socket.id, user);

      console.log(`[socket] client connected: ${user.id}`);

      socket.emit('init', {
        doc: otServer.document,
        revision: otServer.operations.length,
        user,
        users: buildUserSnapshot(clients),
      });

      emitUserList();
      emitLog(`${user.name} joined the chatroom`, user);

      socket.on('set-name', desiredName => {
        const previousName = user.name;
        user.name = safeName(desiredName, previousName);
        emitUserList();
        io.emit('name-updated', {
          id: user.id,
          name: user.name,
          previousName,
          color: user.color,
          timestamp: timestamp(),
        });
        emitLog(`${previousName} is now ${user.name}`, user);
      });

      socket.on('operation', payload => {
        try {
          const revision = Number(payload?.revision ?? -1);
          const operationJSON = payload?.operation;
          if (!Number.isInteger(revision) || !operationJSON) {
            socket.emit('error-message', { message: 'Malformed operation payload received.' });
            return;
          }

          const operation = TextOperation.fromJSON(operationJSON);
          const serverOperation = otServer.receiveOperation(revision, operation);

          const appliedRevision = otServer.operations.length;
          socket.emit('ack', { revision: appliedRevision });

          socket.broadcast.emit('operation', {
            operation: serverOperation.toJSON(),
            revision: appliedRevision,
            authorId: user.id,
            authorName: user.name,
            authorColor: user.color,
            timestamp: timestamp(),
          });

          emitLog(`${user.name} edited the document`, user);
        } catch (error) {
          console.error('[socket] failed to apply operation', error);
          socket.emit('resync', {
            doc: otServer.document,
            revision: otServer.operations.length,
            message: error instanceof Error ? error.message : 'Unknown OT error',
          });
        }
      });

      socket.on('disconnect', reason => {
        clients.delete(socket.id);
        console.log(`[socket] client disconnected: ${user.id} (${reason})`);
        emitUserList();
        emitLog(`${user.name} left the chatroom`, user);
      });
    });

    app.get('/chat', (_req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'chat.html'));
    });

    app.use('/public', express.static(path.join(__dirname, 'public')));

    app.all('*', (req, res) => {
      return handle(req, res);
    });

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Chatroom demo ready at http://localhost:${PORT}/chat\n`);
    });
  })
  .catch(error => {
    console.error('Failed to start collaborative chatroom server', error);
    process.exit(1);
  });
