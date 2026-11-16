// Real-time channel for travellers. Each socket must present a valid access token
// and is placed in a private room, so a traveller only ever receives their own events.
import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { verifyAccessToken } from '../services/token.service.js';

let io = null;

export function initSockets(httpServer) {
  io = new Server(httpServer, { cors: { origin: config.corsOrigins } });
  io.use((socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token || '');
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });
  io.on('connection', (socket) => socket.join(`user:${socket.data.userId}`));
  return io;
}

export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${String(userId)}`).emit(event, payload);
}
