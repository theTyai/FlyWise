import { mongoose } from '@flywise/shared/db.js';
import { ok } from '@flywise/shared/http.js';

export const health = (_req, res) => ok(res, {
  service: 'admin-backend',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
});
