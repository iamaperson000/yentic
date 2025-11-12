/**
 * Simple collaborative chat server.
 *
 * How to run:
 *   1. npm install
 *   2. npm run dev            # development with hot reload
 *      or npm run build && npm run start for production mode
 *   3. Visit http://localhost:3000/chat to open the chatroom
 */

const http = require('node:http');
const express = require('express');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const MAX_MESSAGE_HISTORY = 200;

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Helper to create a consistent timestamp.
const now = () => Date.now();

// Simple palette so each visitor gets a friendly color.
const palette = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#14b8a6', '#facc15', '#f472b6', '#fbbf24'];
let paletteIndex = 0;

const pickColor = () => {
  const color = palette[paletteIndex % palette.length];
  paletteIndex += 1;
  return color;
};

// Memory stores so we can broadcast history/state to newcomers.
const clients = new Map();
const messages = [];

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

    function getUsersSnapshot() {
      return Array.from(clients.values()).map(client => ({
        id: client.id,
        name: client.name,
        color: client.color,
      }));
    }

    function broadcastUsers() {
      io.emit('users', getUsersSnapshot());
    }

    function addMessage(entry) {
      messages.push(entry);
      if (messages.length > MAX_MESSAGE_HISTORY) {
        messages.shift();
      }
    }

    io.on('connection', socket => {
      const user = {
        id: socket.id,
        name: `Guest ${socket.id.slice(-4)}`,
        color: pickColor(),
      };

      clients.set(socket.id, user);

      console.log(`[socket] client connected: ${user.id}`);

      socket.emit('init', {
        self: user,
        users: getUsersSnapshot(),
        messages,
      });

      addMessage({
        id: `system-${now()}`,
        userId: 'system',
        name: 'System',
        color: '#38bdf8',
        text: `${user.name} joined the chat`,
        timestamp: now(),
      });
      io.emit('message', messages[messages.length - 1]);
      broadcastUsers();

      socket.on('set-name', requestedName => {
        if (typeof requestedName !== 'string') {
          return;
        }

        const trimmed = requestedName.trim().slice(0, 32);
        if (!trimmed) {
          return;
        }

        const previousName = user.name;
        user.name = trimmed;

        console.log(`[socket] client ${socket.id} set name to ${user.name}`);

        addMessage({
          id: `system-${now()}`,
          userId: 'system',
          name: 'System',
          color: '#38bdf8',
          text: `${previousName} is now ${user.name}`,
          timestamp: now(),
        });
        io.emit('name-updated', {
          id: user.id,
          name: user.name,
          previousName,
          color: user.color,
        });
        io.emit('message', messages[messages.length - 1]);
        broadcastUsers();
      });

      socket.on('send-message', payload => {
        if (!payload || typeof payload.text !== 'string') {
          return;
        }

        const text = payload.text.trim();
        if (!text) {
          return;
        }

        const message = {
          id: `${socket.id}-${now()}`,
          userId: user.id,
          name: user.name,
          color: user.color,
          text,
          timestamp: now(),
        };

        addMessage(message);
        console.log(`[socket] message from ${user.id}: ${text}`);
        socket.broadcast.emit('message', message);
        socket.emit('message-delivered', { id: message.id });
        socket.emit('message', message); // echo to sender for consistency
      });

      socket.on('disconnect', reason => {
        clients.delete(socket.id);
        console.log(`[socket] client disconnected: ${user.id} (${reason})`);

        addMessage({
          id: `system-${now()}`,
          userId: 'system',
          name: 'System',
          color: '#38bdf8',
          text: `${user.name} left the chat`,
          timestamp: now(),
        });
        io.emit('message', messages[messages.length - 1]);
        broadcastUsers();
      });
    });

    app.use((req, res) => {
      return handle(req, res);
    });

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Chatroom server running at http://localhost:${PORT}/chat\n`);
    });
  })
  .catch(error => {
    console.error('Failed to start chat server', error);
    process.exit(1);
  });
