// In-app notifications for travellers. Saved first, then pushed live over Socket.IO.
import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'BookingRequest' },
  bookingReference: String,
  type: { type: String, required: true }, // one of NOTIFICATION_TYPE
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification
  || mongoose.model('Notification', notificationSchema, 'notifications');
