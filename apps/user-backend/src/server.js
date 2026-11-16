// Entry point of the user backend:  npm run dev -w @flywise/user-backend
// Connects to MongoDB, starts the HTTP server and attaches Socket.IO to it.
import http from 'node:http';
import { connectDB } from '@flywise/shared/db.js';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { getFlightProvider } from './integrations/flight-provider/index.js';
import { initSockets } from './sockets/index.js';

async function start() {
  await connectDB(config.mongoUri);
  const server = http.createServer(createApp());
  initSockets(server);
  server.listen(config.port, () => {
    console.log(`[user-backend] http://localhost:${config.port}  flight data: ${getFlightProvider().label}`);
  });
}

start().catch((err) => {
  console.error('[user-backend] failed to start:', err.message);
  if (/ECONNREFUSED|server selection/i.test(err.message)) {
    console.error('[user-backend] MongoDB is not reachable. Start it (see docs/setup-guide.md) and check MONGODB_URI in .env.');
  }
  process.exit(1);
});
