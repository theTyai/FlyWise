// Service-to-service endpoint. The admin backend calls it after it has saved a decision
// and its notification, so the traveller's open browser tab updates without a refresh.
import { ok } from '@flywise/shared/http.js';
import { emitToUser } from '../sockets/index.js';

export const relayEvent = (req, res) => {
  const { userId, notification, booking } = req.body;
  if (notification) emitToUser(userId, 'notification', notification);
  if (booking) emitToUser(userId, 'booking:update', booking);
  ok(res, { delivered: true });
};
