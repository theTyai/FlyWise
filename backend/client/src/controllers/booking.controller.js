import { asyncHandler, ok } from '@flywise/shared/http.js';
import * as bookingService from '../services/booking.service.js';
import * as seatLockService from '../services/seatLock.service.js';
import * as ticketService from '../services/ticket.service.js';

export const create = asyncHandler(async (req, res) => {
  const result = await bookingService.createBooking(req.user, req.body);
  ok(res, result.booking ? result : { booking: result }, undefined, 201);
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

export const cancel = asyncHandler(async (req, res) => {
  ok(res, await bookingService.cancelBooking(req.user, req.params.id, req.body.reason));
});

// ---- Real-time 5-minute Seat Lock ----
export const lockSeat = asyncHandler(async (req, res) => {
  const lock = await seatLockService.acquireSeatLock(req.user, req.body);
  ok(res, { lock }, undefined, 201);
});

export const getLock = asyncHandler(async (req, res) => {
  const lock = await seatLockService.getActiveSeatLock(req.params.lockKey, req.user._id);
  ok(res, { lock });
});

export const releaseLock = asyncHandler(async (req, res) => {
  const result = await seatLockService.releaseSeatLock(req.params.lockKey, req.user._id);
  ok(res, result);
});

// ---- Payment Completion & Ticket Generation ----
export const confirmPayment = asyncHandler(async (req, res) => {
  const result = await bookingService.confirmBookingWithPayment(req.user, req.body);
  ok(res, result, undefined, 201);
});

// ---- E-Ticket Retrieval ----
export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketForBooking(req.params.id, req.user._id);
  ok(res, { ticket });
});
