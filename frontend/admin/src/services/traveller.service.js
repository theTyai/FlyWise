// Traveller accounts (/users).
import { api, query } from './api.js';

export const listTravellers = (params) => api.get(`/users${query(params)}`); // { users, meta }
export const setAccountStatus = (id, accountStatus) => api.patch(`/users/${id}/status`, { accountStatus });
