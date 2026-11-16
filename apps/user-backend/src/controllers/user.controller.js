import { asyncHandler, ok } from '@flywise/shared/http.js';
import { updateProfile } from '../services/user.service.js';
import { publicUser } from '../utils/serializers.js';

export const getMe = (req, res) => ok(res, { user: publicUser(req.user) });

export const updateMe = asyncHandler(async (req, res) => {
  ok(res, { user: await updateProfile(req.user._id, req.body) });
});
