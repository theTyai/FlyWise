// Booking request endpoints (/bookings). All of them need a signed-in traveller.
import { api } from './api.js';

export const listBookings = () => api.get('/bookings');
export const getBooking = (id) => api.get(`/bookings/${id}`);

export const createBooking = ({ offerId, passengers, contact }) => api.post('/bookings', {
  offerId, passengers, contact, acknowledgeSimulated: true,
});

export const updateBooking = (id, { passengers, contact }) => api.patch(`/bookings/${id}`, { passengers, contact });
export const cancelBooking = (id, reason) => api.post(`/bookings/${id}/cancel`, reason ? { reason } : {});

// Seat Lock & Real-time Checkout
export const acquireSeatLock = ({ offerId, seats }) => api.post('/bookings/lock', { offerId, seats });
export const getSeatLock = (lockKey) => api.get(`/bookings/lock/${lockKey}`);
export const releaseSeatLock = (lockKey) => api.post(`/bookings/lock/${lockKey}/release`);

// Payment confirmation (Pass & Done simulated payment)
export const confirmPayment = ({ lockKey, offerId, passengers, contact, paymentMethod }) => api.post('/bookings/confirm-payment', {
  lockKey, offerId, passengers, contact, paymentMethod,
});

// E-Ticket
export const getTicket = (bookingId) => api.get(`/bookings/${bookingId}/ticket`);
