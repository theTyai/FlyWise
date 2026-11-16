// Desk sign-in. There is deliberately no registration: admin accounts are created only by
// the seed script (see src/scripts/seedAdmin.js).
import bcrypt from 'bcryptjs';
import { ApiError } from '@flywise/shared/http.js';
import { Admin } from '@flywise/shared/models.js';
import { publicAdmin } from '../utils/serializers.js';
import { signAdminToken } from './token.service.js';

export async function login({ email, password }) {
  const admin = await Admin.findOne({ email }).select('+passwordHash');
  const matches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
  if (!matches) throw new ApiError(401, 'BAD_CREDENTIALS', 'Email or password is incorrect');
  if (admin.accountStatus !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This desk account is suspended');
  return { admin: publicAdmin(admin), accessToken: signAdminToken(admin) };
}
