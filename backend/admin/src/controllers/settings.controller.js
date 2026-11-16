import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as settingsService from '../services/settings.service.js';

export const read = asyncHandler(async (_req, res) => {
  ok(res, { settings: await settingsService.readSettings() });
});

export const update = asyncHandler(async (req, res) => {
  ok(res, { settings: await settingsService.updateSettings(req.admin, req.body) });
});

export const services = asyncHandler(async (_req, res) => {
  ok(res, { services: await settingsService.serviceStatus() });
});
