import { mongoose } from '@flywise/shared/db.js';
import { asyncHandler, ok } from '@flywise/shared/http.js';
import { aiServiceHealth } from '../integrations/ai-service/client.js';
import { getFlightProvider } from '../integrations/flight-provider/index.js';

// GET /health - used by the desk's Settings page and by scripts/check.mjs.
export const health = asyncHandler(async (_req, res) => {
  const provider = getFlightProvider();
  ok(res, {
    service: 'user-backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    flightProvider: { name: provider.name, mode: provider.mode, label: provider.label },
    aiService: (await aiServiceHealth()) ? 'reachable' : 'unreachable',
  });
});
