/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Custom Next.js server used for local development and production app start.
 */

const http = require('node:http');
const express = require('express');
const next = require('next');

const PORT = Number(process.env.PORT) || 3000;

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    const app = express();
    const server = http.createServer(app);

    app.use((req, res) => {
      return handle(req, res);
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 Yentic running at http://localhost:${PORT}\n`);
    });
  })
  .catch(error => {
    console.error('Failed to start chat server', error);
    process.exit(1);
  });
