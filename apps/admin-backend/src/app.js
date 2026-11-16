// Builds the Express app: security middleware, routes, error handling.
// Kept separate from server.js so the app can be created without opening a port.
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound, sanitizeRequest } from '@flywise/shared/http.js';
import { config } from './config/index.js';
import { health } from './controllers/health.controller.js';
import { limiter } from './middleware/rateLimit.js';
import apiRoutes from './routes/index.js';
import internalRoutes from './routes/internal.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet()); // security headers
  app.use(cors({ origin: config.corsOrigins })); // only the desk frontend may call this API
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeRequest); // strip "$" and "." keys (NoSQL-injection guard)

  app.get('/health', health);
  app.use('/internal', internalRoutes);
  app.use('/api/v1/admin', limiter(900, 'Too many requests. Slow down and try again shortly.'), apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
