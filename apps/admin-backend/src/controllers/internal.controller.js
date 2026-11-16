// Service-to-service endpoint. The user backend calls it when a traveller creates, edits
// or cancels a request, so every open desk tab refreshes its lists.
import { ok } from '@flywise/shared/http.js';
import { emitToDesk } from '../sockets/index.js';

export const relayEvent = (req, res) => {
  const { event, ...payload } = req.body;
  emitToDesk(event, payload);
  ok(res, { delivered: true });
};
