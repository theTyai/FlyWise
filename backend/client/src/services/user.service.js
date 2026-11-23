// The traveller's own profile.
import { User } from '@flywise/shared/models.js';
import { publicUser } from '../utils/serializers.js';

export async function updateProfile(userId, changes) {
  const current = await User.findById(userId);
  if (!current) return null;

  const merged = {
    ...current.toObject(),
    ...changes,
    address: { ...(current.address?.toObject?.() || current.address || {}), ...(changes.address || {}) },
  };

  const isComplete = Boolean(
    merged.name?.trim() &&
    merged.phone?.trim() &&
    merged.gender &&
    merged.dateOfBirth &&
    merged.address?.city?.trim() &&
    merged.address?.pincode?.trim()
  );

  changes.profileComplete = isComplete;
  if (changes.address) {
    changes.address = merged.address;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: changes }, { new: true, runValidators: true });
  return publicUser(user);
}
