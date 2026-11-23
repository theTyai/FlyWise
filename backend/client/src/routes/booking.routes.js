// /api/v1/bookings - traveller booking requests, seat locks, payment, tickets.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as bookings from '../controllers/booking.controller.js';
import { requireUser } from '../middleware/auth.js';
import {
  cancelBookingSchema, confirmPaymentSchema, createBookingSchema, listBookingsSchema, lockSeatSchema, updateBookingSchema,
} from '../validators/booking.validators.js';

const router = Router();
router.use(requireUser);

// Seat locks
router.post('/lock', validate(lockSeatSchema), bookings.lockSeat);
router.get('/lock/:lockKey', bookings.getLock);
router.post('/lock/:lockKey/release', bookings.releaseLock);

// Payment confirmation (Pass and done)
router.post('/confirm-payment', validate(confirmPaymentSchema), bookings.confirmPayment);

// Standard bookings
router.post('/', validate(createBookingSchema), bookings.create); // Create
router.get('/', validate(listBookingsSchema, 'query'), bookings.list); // Read (list)
router.get('/:id', bookings.getOne); // Read (one)
router.get('/:id/ticket', bookings.getTicket); // E-ticket
router.patch('/:id', validate(updateBookingSchema), bookings.update); // Update
router.post('/:id/cancel', validate(cancelBookingSchema), bookings.cancel); // Delete (soft)

export default router;
