// The traveller's own profile.
import { User } from '@flywise/shared/models.js';
import { publicUser } from '../utils/serializers.js';

// "changes" has already been validated: only name and phone can reach this point.
export async function updateProfile(userId, changes) {
  const user = await User.findByIdAndUpdate(userId, { $set: changes }, { new: true, runValidators: true });
  return publicUser(user);
}
