// Authentication for traveller routes. Every protected request re-checks the token AND
// the account on the server; the frontend's route guard is only a convenience.
import { ApiError, asyncHandler } from '@flywise/shared/http.js';
import { User } from '@flywise/shared/models.js';
import { verifyAccessToken } from '../services/token.service.js';

function bearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function loadUser(token) {
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in again to continue');
  if (user.accountStatus !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  return user;
}

// 401 without a valid token. On success the account is available as req.user.
export const requireUser = asyncHandler(async (req, _res, next) => {
  const token = bearer(req);
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  try {
    req.user = await loadUser(token);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // TOKEN_INVALID tells the frontend to try its refresh token once.
    throw new ApiError(401, 'TOKEN_INVALID', 'Your session has expired. Sign in again.');
  }
  next();
});

// Search works without an account. When a valid token is present the search is saved to that user.
export const optionalUser = asyncHandler(async (req, _res, next) => {
  const token = bearer(req);
  if (token) {
    try { req.user = await loadUser(token); } catch { req.user = null; }
  }
  next();
});
