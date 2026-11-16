// Builds the Express app: security middleware, routes, error handling.
// Kept separate from server.js so the app can be created without opening a port.
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOptions, errorHandler, notFound, sanitizeRequest } from '@flywise/shared/http.js';
import { config } from './config/index.js';
import { health } from './controllers/health.controller.js';
import { getFlightProvider } from './integrations/flight-provider/index.js';
import apiRoutes from './routes/index.js';
import internalRoutes from './routes/internal.routes.js';

export function createApp() {
  getFlightProvider(); // fail fast at start-up on a bad FLIGHT_PROVIDER setting

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow cross-origin API access
  app.use(cors(corsOptions(config.corsOrigins))); // allow traveller frontend origins
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeRequest); // strip "$" and "." keys (NoSQL-injection guard)

  app.get('/health', health);
  app.use('/internal', internalRoutes);
  app.use('/api/v1', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
