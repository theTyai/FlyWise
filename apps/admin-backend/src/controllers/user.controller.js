import { asyncHandler, ok, pageMeta, paginate } from '@flywise/shared/http.js';
import * as userService from '../services/user.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.validQuery);
  const { users, total } = await userService.listTravellers({ q: req.validQuery.q, skip, limit });
  ok(res, { users }, pageMeta(page, limit, total));
});

export const setStatus = asyncHandler(async (req, res) => {
  ok(res, { user: await userService.setAccountStatus(req.admin, req.params.id, req.body.accountStatus) });
});
