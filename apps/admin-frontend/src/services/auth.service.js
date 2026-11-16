// Desk sign-in (/auth).
import { api } from './api.js';

export const login = (email, password) => api.post('/auth/login', { email, password }); // { admin, accessToken }
export const getMe = () => api.get('/auth/me');
