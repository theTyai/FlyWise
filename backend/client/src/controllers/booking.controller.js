import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as bookingService from '../services/booking.service.js';

export const create = asyncHandler(async (req, res) => {
  ok(res, { booking: await bookingService.createBooking(req.user, req.body) }, undefined, 201);
});

export const list = asyncHandler(async (req, res) => {
  ok(res, { bookings: await bookingService.listBookings(req.user, req.validQuery.status) });
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, { booking: await bookingService.getBooking(req.user, req.params.id) });
});

export const update = asyncHandler(async (req, res) => {
  ok(res, { booking: await bookingService.updateBooking(req.user, req.params.id, req.body) });
});

// Responds with { booking } and, when it was already cancelled, { alreadyCancelled: true }.
export const cancel = asyncHandler(async (req, res) => {
  ok(res, await bookingService.cancelBooking(req.user, req.params.id, req.body.reason));
});
