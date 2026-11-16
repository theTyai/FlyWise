import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as notificationService from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  ok(res, await notificationService.listNotifications(req.user._id));
});

export const readAll = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  ok(res, { unreadCount: 0 });
});

export const readOne = asyncHandler(async (req, res) => {
  ok(res, { notification: await notificationService.markRead(req.user._id, req.params.id) });
});
