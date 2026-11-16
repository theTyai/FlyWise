// Sign-up, sign-in, token refresh and sign-out for travellers.
import bcrypt from 'bcryptjs';
import { ApiError } from '@flywise/shared/http.js';
import { User } from '@flywise/shared/models.js';
import { publicUser } from '../utils/serializers.js';
import { issueTokens, revokeTokens, verifyRefreshToken } from './token.service.js';

const BCRYPT_ROUNDS = 11;
const session = async (user) => ({ user: publicUser(user), ...(await issueTokens(user)) });

export async function register({ name, email, phone, password }) {
  if (await User.exists({ email })) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // The role is fixed here. It is never read from the request.
  const user = await User.create({ name, email, phone: phone || undefined, passwordHash, role: 'USER' });
  return session(user);
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  // One message for "no such account" and "wrong password", so emails cannot be probed.
  if (!matches) throw new ApiError(401, 'BAD_CREDENTIALS', 'Email or password is incorrect');
  if (user.accountStatus !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  return session(user);
}

export async function refresh(refreshToken) {
  const invalid = () => new ApiError(401, 'REFRESH_INVALID', 'Your session has expired. Sign in again.');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw invalid();
  }
  const user = await User.findById(payload.sub).select('+refreshTokenId');
  if (!user || user.refreshTokenId !== payload.jti || user.accountStatus !== 'ACTIVE') throw invalid();
  return session(user);
}

export const logout = (userId) => revokeTokens(userId);
