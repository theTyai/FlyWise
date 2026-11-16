// Simulated seat inventory (/inventory).
import { api, query } from './api.js';

export const listInventory = (params) => api.get(`/inventory${query(params)}`); // { inventory, meta }
export const createInventory = (record) => api.post('/inventory', record);
export const updateSeatTotal = (id, totalSeats) => api.patch(`/inventory/${id}`, { totalSeats });
