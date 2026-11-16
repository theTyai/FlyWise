// Append-only record of every desk action. There is no update or delete endpoint for it.
import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, required: true },
  actorName: String,
  actorRole: { type: String, default: 'ADMIN' },
  action: { type: String, required: true }, // BOOKING_CONFIRMED, INVENTORY_UPDATED, USER_SUSPENDED ...
  bookingId: { type: Schema.Types.ObjectId, ref: 'BookingRequest', default: null },
  bookingReference: String,
  previousStatus: String,
  newStatus: String,
  reason: String,
  meta: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true },
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema, 'auditLogs');
