// Tells the traveller (and other open desk tabs) about a decision.
import { postInternal } from '@flywise/shared/http.js';
import { Notification } from '@flywise/shared/models.js';
import { config } from '../config/index.js';
import { emitToDesk } from '../sockets/index.js';

// Save the notification first: that is the record. Pushing it to the traveller's browser
// goes through the user backend (which owns the traveller sockets) and is best-effort.
export async function notifyTraveller(booking, type, title, message) {
  const notification = await Notification.create({
    userId: booking.userId, bookingId: booking._id, bookingReference: booking.bookingReference, type, title, message,
  });
  if (process.env.FLYWISE_SEEDING !== 'true') {
    postInternal(`${config.userBackendUrl}/internal/events`, config.internalKey, {
      userId: String(booking.userId),
      notification: {
        id: String(notification._id), type, title, message, read: false,
        bookingId: String(booking._id), bookingReference: booking.bookingReference, createdAt: notification.createdAt,
      },
      booking: { bookingId: String(booking._id), status: booking.status },
    });
    emitToDesk('booking:update', { bookingId: String(booking._id), bookingReference: booking.bookingReference, status: booking.status });
  }
}
