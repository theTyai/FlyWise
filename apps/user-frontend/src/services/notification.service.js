// Notification endpoints (/notifications).
import { api } from './api.js';

export const listNotifications = () => api.get('/notifications'); // { notifications, unreadCount }
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.post('/notifications/read-all');
