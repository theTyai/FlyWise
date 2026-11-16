// JSON Web Tokens for travellers.
//  - Access token: 30 minutes, sent as "Authorization: Bearer ..." on every request.
//  - Refresh token: 7 days, exchanged for a new pair. Each one carries an id (jti) and
//    only the latest id is stored on the user, so an old or stolen refresh token stops
//    working the moment a newer one is issued ("refresh-token rotation").
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { User } from '@flywise/shared/models.js';
import { config } from '../config/index.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: 'USER' }, config.jwtSecret, { expiresIn: config.accessTtl });
}

// Throws when the token is missing, expired, forged, or not a traveller token.
export function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.role !== 'USER') throw new Error('wrong role');
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.refreshSecret);
  if (payload.type !== 'refresh') throw new Error('wrong token type');
  return payload;
}

// Issue a fresh access + refresh pair and remember the new refresh-token id.
export async function issueTokens(user) {
  const tokenId = crypto.randomUUID();
  await User.updateOne({ _id: user._id }, { $set: { refreshTokenId: tokenId } });
  const refreshToken = jwt.sign({ sub: String(user._id), jti: tokenId, type: 'refresh' }, config.refreshSecret, {
    expiresIn: config.refreshTtl,
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

// Signing out forgets the refresh-token id, so no refresh token works afterwards.
export async function revokeTokens(userId) {
  await User.updateOne({ _id: userId }, { $set: { refreshTokenId: null } });
}
