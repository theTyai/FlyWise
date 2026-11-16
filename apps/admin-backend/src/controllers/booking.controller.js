import { asyncHandler, ok, pageMeta, paginate } from '@flywise/shared/http.js';
import { getBookingDetail, listBookings } from '../services/booking.service.js';
import { confirmBooking, rejectBooking, revokeBooking } from '../services/decision.service.js';

export const list = asyncHandler(async (req, res) => {
  const { status, q } = req.validQuery;
  const { page, limit, skip } = paginate(req.validQuery);
  const { bookings, total } = await listBookings({ status, q, skip, limit });
  ok(res, { bookings }, pageMeta(page, limit, total));
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await getBookingDetail(req.params.id));
});

// Each decision answers with the refreshed detail view, so the screen updates in one round trip.
export const confirm = asyncHandler(async (req, res) => {
  // The desk app sends a random Idempotency-Key per click; it is stored with the decision.
  const idempotencyKey = String(req.headers['idempotency-key'] || '').slice(0, 80) || null;
  const { alreadyConfirmed } = await confirmBooking({ bookingId: req.params.id, admin: req.admin, idempotencyKey });
  ok(res, { ...(await getBookingDetail(req.params.id)), alreadyConfirmed });
});

export const reject = asyncHandler(async (req, res) => {
  await rejectBooking({ bookingId: req.params.id, admin: req.admin, reason: req.body.reason });
  ok(res, await getBookingDetail(req.params.id));
});

export const revoke = asyncHandler(async (req, res) => {
  await revokeBooking({ bookingId: req.params.id, admin: req.admin, reason: req.body.reason });
  ok(res, await getBookingDetail(req.params.id));
});
