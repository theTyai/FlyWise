// Settings and service health (/settings).
import { api } from './api.js';

export const getSettings = () => api.get('/settings');
export const updateSettings = (changes) => api.patch('/settings', changes);
export const getServiceStatus = () => api.get('/settings/services');
