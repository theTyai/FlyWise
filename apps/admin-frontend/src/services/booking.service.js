// Booking requests and the three desk decisions (/bookings).
import { api, query } from './api.js';

// params: { status, q, page, limit }. Resolves with { bookings, meta }.
export const listBookings = (params) => api.get(`/bookings${query(params)}`);

// How many requests are waiting right now (the sidebar badge).
export const countWaiting = () => listBookings({ status: 'PENDING_ADMIN_APPROVAL', limit: 1 }).then((data) => data.meta?.total ?? 0);

// Resolves with { booking, inventory, allocation, audit }; so does every decision below.
export const getBooking = (id) => api.get(`/bookings/${id}`);

const safeUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

// A fresh Idempotency-Key per click: if the same click is sent twice, seats are taken once.
export const confirmBooking = (id) => api.post(`/bookings/${id}/confirm`, {}, { 'Idempotency-Key': safeUUID() });
export const rejectBooking = (id, reason) => api.post(`/bookings/${id}/reject`, { reason });
export const revokeBooking = (id, reason) => api.post(`/bookings/${id}/revoke`, { reason });
