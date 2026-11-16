// Every setting the user backend reads, in one place. Values come from the root .env file
// (loaded by @flywise/shared/env.js). Nothing else in this service touches process.env.
import { env, envInt, secret } from '@flywise/shared/env.js';

export const config = {
  port: envInt('USER_BACKEND_PORT', 5000),
  mongoUri: env('MONGODB_URI', 'mongodb://127.0.0.1:27017/flywise_db'),

  // Traveller sessions: a short-lived access token plus a rotating refresh token.
  jwtSecret: secret('USER_JWT_SECRET', 'dev-user-access-secret'),
  refreshSecret: secret('USER_REFRESH_SECRET', 'dev-user-refresh-secret'),
  accessTtl: '30m',
  refreshTtl: '7d',

  // Shared key for service-to-service calls (admin backend, AI service).
  internalKey: secret('INTERNAL_SERVICE_KEY', 'dev-internal-key'),
  aiServiceUrl: env('AI_SERVICE_URL', 'http://localhost:8000').replace(/\/$/, ''),
  adminBackendUrl: env('ADMIN_BACKEND_URL', 'http://localhost:5001').replace(/\/$/, ''),

  // Browser origins allowed to call this API (comma-separated in .env).
  corsOrigins: env('USER_FRONTEND_ORIGIN', 'http://localhost:5173').split(',').map((s) => s.trim()),

  // Flight provider: "real_schedule" (real airline schedules, no token needed) or "mock".
  flightProvider: env('FLIGHT_PROVIDER', 'real_schedule').toLowerCase(),
};
