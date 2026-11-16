// Overview figures (/dashboard).
import { api } from './api.js';

export const getDashboard = () => api.get('/dashboard');
