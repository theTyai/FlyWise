import { asyncHandler, ok } from '@flywise/shared/http.js';
import { getDashboard } from '../services/dashboard.service.js';

export const overview = asyncHandler(async (_req, res) => {
  ok(res, await getDashboard());
});
