// Account endpoints of the user backend (/auth, /users/me).
import { api } from './api.js';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (form) => api.post('/auth/register', form);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/users/me');
export const updateProfile = (changes) => api.patch('/users/me', changes);
