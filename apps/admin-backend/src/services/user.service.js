// Traveller accounts as the desk sees them: list, suspend, reactivate.
import { isValidId } from '@flywise/shared/db.js';
import { ApiError, escapeRegex } from '@flywise/shared/http.js';
import { BookingRequest, User } from '@flywise/shared/models.js';
import { serializeTraveller } from '../utils/serializers.js';
import { writeAudit } from './audit.service.js';

export async function listTravellers({ q, skip, limit }) {
  const filter = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  // One aggregation for the whole page instead of one count query per traveller.
  const counts = await BookingRequest.aggregate([
    { $match: { userId: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  return { users: users.map((u) => serializeTraveller(u, byUser[String(u._id)] || 0)), total };
}

// Clearing refreshTokenId signs the traveller out everywhere: their refresh token stops
// working, and the user backend rejects their access token on its next account check.
export async function setAccountStatus(admin, id, accountStatus) {
  const user = isValidId(id)
    ? await User.findByIdAndUpdate(id, { $set: { accountStatus, refreshTokenId: null } }, { new: true })
    : null;
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Traveller account not found');
  await writeAudit(admin, accountStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', null, {
    meta: { userId: String(user._id), email: user.email },
  });
  return { id: String(user._id), accountStatus: user.accountStatus };
}
