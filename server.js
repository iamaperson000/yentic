/* eslint-disable @typescript-eslint/no-require-imports */
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
const MAX_MESSAGE_LENGTH = 800;
const MAX_NAME_LENGTH = 32;

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

    function sanitizeMessageId(value) {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.slice(0, 64);
    }

    function sanitizeText(value, maxLength) {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.slice(0, maxLength);
    }

    function createSystemMessage(text) {
      const entry = {
        id: `system-${now()}`,
        userId: 'system',
        name: 'System',
        color: '#38bdf8',
        text,
        timestamp: now(),
      };
      addMessage(entry);
      return entry;
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

      io.emit('message', createSystemMessage(`${user.name} joined the chat`));
      broadcastUsers();

      socket.on('set-name', requestedName => {
        const trimmed = sanitizeText(requestedName, MAX_NAME_LENGTH);
        if (!trimmed) return;

        const previousName = user.name;
        user.name = trimmed;
        clients.set(socket.id, user);

        console.log(`[socket] client ${socket.id} set name to ${user.name}`);

        const systemMessage = createSystemMessage(`${previousName} is now ${user.name}`);
        io.emit('name-updated', {
          id: user.id,
          name: user.name,
          previousName,
          color: user.color,
        });
        io.emit('message', systemMessage);
        broadcastUsers();
      });

      socket.on('send-message', payload => {
        const text = sanitizeText(payload?.text, MAX_MESSAGE_LENGTH);
        if (!text) return;

        const providedId = sanitizeMessageId(payload?.clientMessageId);
        const messageId = providedId || `${socket.id}-${now()}`;

        const message = {
          id: messageId,
          userId: user.id,
          name: user.name,
          color: user.color,
          text,
          timestamp: now(),
        };

        addMessage(message);
        console.log(`[socket] message from ${user.id}: ${text}`);
        io.emit('message', message);
        socket.emit('message-delivered', { id: message.id });
      });

      socket.on('disconnect', reason => {
        clients.delete(socket.id);
        console.log(`[socket] client disconnected: ${user.id} (${reason})`);

        io.emit('message', createSystemMessage(`${user.name} left the chat`));
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
