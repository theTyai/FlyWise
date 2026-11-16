// Authentication and authorisation for the desk API.
//   401 - no valid admin token
//   403 - valid token, but the account is suspended or lacks the permission
// The frontend's route guard is not relied on: every admin endpoint runs these checks.
import { ApiError, asyncHandler } from '@flywise/shared/http.js';
import { Admin } from '@flywise/shared/models.js';
import { verifyAdminToken } from '../services/token.service.js';

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to the desk to continue');
  let payload;
  try {
    payload = verifyAdminToken(header.slice(7));
  } catch {
    throw new ApiError(401, 'TOKEN_INVALID', 'Your desk session has expired. Sign in again.');
  }
  // The account is re-read on every request, so suspending an admin takes effect immediately.
  const admin = await Admin.findById(payload.sub);
  if (!admin || admin.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'This account does not have desk access');
  if (admin.accountStatus !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This desk account is suspended');
  req.admin = admin;
  next();
});

// Use after requireAdmin:  router.post('/:id/confirm', requirePermission('APPROVE_BOOKINGS'), ...)
export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.admin?.permissions?.includes(permission)) {
    return next(new ApiError(403, 'FORBIDDEN', `Your desk account is missing the ${permission} permission`));
  }
  return next();
};
