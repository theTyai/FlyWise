// Live updates for the desk app. Only sockets with a valid admin token may connect.
import { Server } from 'socket.io';
import { corsOptions } from '@flywise/shared/http.js';
import { config } from '../config/index.js';
import { verifyAdminToken } from '../services/token.service.js';

let io = null;

export function initSockets(httpServer) {
  io = new Server(httpServer, { cors: corsOptions(config.corsOrigins) });
  io.use((socket, next) => {
    try {
      verifyAdminToken(socket.handshake.auth?.token || '');
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });
  io.on('connection', (socket) => socket.join('desk'));
  return io;
}

export function emitToDesk(event, payload) {
  if (io) io.to('desk').emit(event, payload);
}
