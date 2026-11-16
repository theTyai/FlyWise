// Booking request endpoints (/bookings). All of them need a signed-in traveller.
import { api } from './api.js';

export const listBookings = () => api.get('/bookings');
export const getBooking = (id) => api.get(`/bookings/${id}`);

// Only the offer id, the travellers and the contact are sent. The fare and flight
// details are read by the server from its own stored offer.
export const createBooking = ({ offerId, passengers, contact }) => api.post('/bookings', {
  offerId, passengers, contact, acknowledgeSimulated: true,
});

export const updateBooking = (id, { passengers, contact }) => api.patch(`/bookings/${id}`, { passengers, contact });
export const cancelBooking = (id, reason) => api.post(`/bookings/${id}/cancel`, reason ? { reason } : {});
