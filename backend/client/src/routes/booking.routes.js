// /api/v1/bookings - the traveller's own booking requests (CRUD).
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as bookings from '../controllers/booking.controller.js';
import { requireUser } from '../middleware/auth.js';
import {
  cancelBookingSchema, createBookingSchema, listBookingsSchema, updateBookingSchema,
} from '../validators/booking.validators.js';

const router = Router();
router.use(requireUser);

router.post('/', validate(createBookingSchema), bookings.create); // Create
router.get('/', validate(listBookingsSchema, 'query'), bookings.list); // Read (list)
router.get('/:id', bookings.getOne); // Read (one)
router.patch('/:id', validate(updateBookingSchema), bookings.update); // Update
router.post('/:id/cancel', validate(cancelBookingSchema), bookings.cancel); // Delete (soft)

export default router;
