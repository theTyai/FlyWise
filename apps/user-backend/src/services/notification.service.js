// Notifications for travellers, and the "something changed" signal sent to the desk.
import { isValidId } from '@flywise/shared/db.js';
import { ApiError, postInternal } from '@flywise/shared/http.js';
import { Notification } from '@flywise/shared/models.js';
import { config } from '../config/index.js';
import { emitToUser } from '../sockets/index.js';
import { serializeNotification } from '../utils/serializers.js';

// Save first, push second. The saved notification is the record; the live push is a
// convenience, so a socket problem never loses a notification or fails the request.
export async function notifyUser({ userId, booking, type, title, message }) {
  const notification = await Notification.create({
    userId, type, title, message,
    bookingId: booking?._id, bookingReference: booking?.bookingReference,
  });
  emitToUser(userId, 'notification', serializeNotification(notification));
  if (booking) emitToUser(userId, 'booking:update', { bookingId: String(booking._id), status: booking.status });
  return notification;
}

// Tell the admin backend so open desk dashboards refresh. Fire-and-forget: the request
// that triggered it has already succeeded and must not fail if the desk is offline.
export function notifyDesk(event, booking) {
  return postInternal(`${config.adminBackendUrl}/internal/events`, config.internalKey, {
    event,
    bookingId: String(booking._id),
    bookingReference: booking.bookingReference,
    status: booking.status,
  });
}

export async function listNotifications(userId) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(60),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { notifications: notifications.map(serializeNotification), unreadCount };
}

export async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
}

// The userId in the filter means a traveller can only mark their own notifications.
export async function markRead(userId, notificationId) {
  const notification = isValidId(notificationId)
    ? await Notification.findOneAndUpdate({ _id: notificationId, userId }, { $set: { read: true } }, { new: true })
    : null;
  if (!notification) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  return serializeNotification(notification);
}
