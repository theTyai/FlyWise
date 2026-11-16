// Controllers translate HTTP <-> service calls. They contain no business rules:
// read the validated request, call a service, send the result with ok().
import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  ok(res, await authService.register(req.body), undefined, 201);
});

export const login = asyncHandler(async (req, res) => {
  ok(res, await authService.login(req.body));
});

export const refresh = asyncHandler(async (req, res) => {
  ok(res, await authService.refresh(req.body.refreshToken));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  ok(res, { signedOut: true });
});
