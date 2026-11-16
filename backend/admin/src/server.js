// Entry point of the admin backend:  npm run dev -w @flywise/admin-backend
// Connects to MongoDB, makes sure a desk account exists, then starts HTTP + Socket.IO.
import http from 'node:http';
import { connectDB } from '@flywise/shared/db.js';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { ensureAdmin } from './scripts/seedAdmin.js';
import { initSockets } from './sockets/index.js';

async function start() {
  await connectDB(config.mongoUri);
  await ensureAdmin();
  const server = http.createServer(createApp());
  initSockets(server);
  server.listen(config.port, () => console.log(`[admin-backend] http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error('[admin-backend] failed to start:', err.message);
  if (/ECONNREFUSED|server selection/i.test(err.message)) {
    console.error('[admin-backend] MongoDB is not reachable. Start it (see docs/setup-guide.md) and check MONGODB_URI in .env.');
  }
  process.exit(1);
});
