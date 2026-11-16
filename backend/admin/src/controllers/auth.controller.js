// Controllers translate HTTP <-> service calls. They contain no business rules.
import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as authService from '../services/auth.service.js';
import { publicAdmin } from '../utils/serializers.js';

export const login = asyncHandler(async (req, res) => {
  ok(res, await authService.login(req.body));
});

export const me = (req, res) => ok(res, { admin: publicAdmin(req.admin) });
