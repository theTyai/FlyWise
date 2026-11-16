// /api/v1/admin/bookings - the request queue and the three decisions.
// Each decision has its own permission, so a desk account can be view-only.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as bookings from '../controllers/booking.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { requireValidId } from '../middleware/validateId.js';
import { listBookingsSchema, reasonSchema } from '../validators/booking.validators.js';

const router = Router();
const validId = requireValidId('BOOKING_NOT_FOUND', 'Booking request not found');

router.get('/', requirePermission('VIEW_REQUESTS'), validate(listBookingsSchema, 'query'), bookings.list);
router.get('/:id', requirePermission('VIEW_REQUESTS'), bookings.getOne);
router.post('/:id/confirm', requirePermission('APPROVE_BOOKINGS'), validId, bookings.confirm);
router.post('/:id/reject', requirePermission('REJECT_BOOKINGS'), validId, validate(reasonSchema), bookings.reject);
router.post('/:id/revoke', requirePermission('REVOKE_BOOKINGS'), validId, validate(reasonSchema), bookings.revoke);

export default router;
