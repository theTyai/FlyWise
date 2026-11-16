// Every setting the admin backend reads, in one place. Values come from the root .env file.
import { env, envInt, secret } from '@flywise/shared/env.js';

export const config = {
  port: envInt('ADMIN_BACKEND_PORT', 5001),
  mongoUri: env('MONGODB_URI', 'mongodb://127.0.0.1:27017/flywise_db'),

  // A different secret from the user backend: a traveller token can never pass as an admin token.
  jwtSecret: secret('ADMIN_JWT_SECRET', 'dev-admin-secret'),
  tokenTtl: '8h', // one working shift; there is no refresh token for the desk

  // Shared key for service-to-service calls.
  internalKey: secret('INTERNAL_SERVICE_KEY', 'dev-internal-key'),
  userBackendUrl: env('USER_BACKEND_URL', 'http://localhost:5000').replace(/\/$/, ''),
  aiServiceUrl: env('AI_SERVICE_URL', 'http://localhost:8000').replace(/\/$/, ''),

  // Browser origins allowed to call this API (comma-separated in .env).
  corsOrigins: env('ADMIN_FRONTEND_ORIGIN', 'http://localhost:5174,http://127.0.0.1:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // First desk account, created at start-up when the admins collection is empty.
  seed: {
    name: env('ADMIN_NAME', 'Desk Admin'),
    email: env('ADMIN_EMAIL', ''),
    password: env('ADMIN_PASSWORD', ''),
  },
};
