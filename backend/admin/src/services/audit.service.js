// The audit log: one entry for every desk action. Entries are only ever created.
import { escapeRegex } from '@flywise/shared/http.js';
import { AuditLog } from '@flywise/shared/models.js';
import { serializeAuditLog } from '../utils/serializers.js';

export async function writeAudit(admin, action, booking, { previousStatus, newStatus, reason, meta } = {}) {
  return AuditLog.create({
    actorId: admin._id, actorName: admin.name, actorRole: 'ADMIN', action,
    bookingId: booking?._id || null, bookingReference: booking?.bookingReference,
    previousStatus, newStatus, reason, meta,
  });
}

export async function listAuditLogs({ q, skip, limit }) {
  const filter = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ action: pattern }, { bookingReference: pattern }, { actorName: pattern }];
  }
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return { logs: logs.map(serializeAuditLog), total };
}
