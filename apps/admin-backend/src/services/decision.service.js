// The three desk decisions: confirm, reject, revoke.
//
// Reliability rules implemented here:
//  - Status only moves along the shared state machine, using conditional updates
//    ("change to X only if the status is still Y"), so two admins acting at the same
//    moment cannot both succeed.
//  - Seats are taken with one atomic conditional decrement, so the last simulated
//    seat can be allocated exactly once.
//  - A unique index on seatAllocations.bookingId makes a double allocation impossible.
//  - Confirming an already-confirmed booking returns the existing result (idempotent).
//  - Every decision writes an audit log entry and a notification.
//
// Seat counts are SIMULATED inventory. A confirmation here is an internal approval,
// never an issued airline ticket.
import { BOOKING_STATUS as S, NOTIFICATION_TYPE as N, canTransition } from '@flywise/shared/constants.js';
import { ApiError } from '@flywise/shared/http.js';
import { BookingRequest, SeatAllocation, SeatInventory } from '@flywise/shared/models.js';
import { writeAudit } from './audit.service.js';
import { notifyTraveller } from './notification.service.js';

// A confirmation that crashed half-way leaves the request "allocating". After this long
// another confirm attempt may take it over.
const STALE_CLAIM_MS = 60 * 1000;

async function load(bookingId) {
  const booking = await BookingRequest.findById(bookingId);
  if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking request not found');
  return booking;
}

const route = (b) => `${b.flight.origin} to ${b.flight.destination}`;

// Return seats to simulated inventory exactly once (ACTIVE -> RELEASED is atomic).
export async function releaseSeats(bookingId) {
  const allocation = await SeatAllocation.findOneAndUpdate(
    { bookingId, status: 'ACTIVE' }, { $set: { status: 'RELEASED', releasedAt: new Date() } },
  );
  if (!allocation) return 0;
  try {
    await SeatInventory.updateOne({ flightKey: allocation.flightKey }, { $inc: { availableSeats: allocation.seats } });
  } catch (err) {
    // If inventory update fails, rollback allocation status so retry is possible
    await SeatAllocation.updateOne({ _id: allocation._id }, { $set: { status: 'ACTIVE', releasedAt: null } }).catch(() => {});
    throw err;
  }
  return allocation.seats;
}

export async function confirmBooking({ bookingId, admin, idempotencyKey = null }) {
  const before = await load(bookingId);
  if (before.status === S.CONFIRMED) return { booking: before, alreadyConfirmed: true };

  // 1. Claim the request. Only one caller can move PENDING -> ALLOCATION_IN_PROGRESS.
  //    A claim abandoned by a crash can be picked up again after a minute.
  const claimed = await BookingRequest.findOneAndUpdate(
    { _id: bookingId, $or: [
      { status: S.PENDING_ADMIN_APPROVAL },
      { status: S.ALLOCATION_IN_PROGRESS, updatedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } },
    ] },
    { $set: { status: S.ALLOCATION_IN_PROGRESS }, $push: { history: { status: S.ALLOCATION_IN_PROGRESS, actor: 'ADMIN', note: 'Checking simulated seat inventory' } } },
    { new: true },
  );
  if (!claimed) {
    const latest = await load(bookingId);
    if (latest.status === S.CONFIRMED) return { booking: latest, alreadyConfirmed: true };
    if (latest.status === S.ALLOCATION_IN_PROGRESS) {
      throw new ApiError(409, 'IN_PROGRESS', 'Another confirmation for this request is in progress. Refresh in a moment.');
    }
    throw new ApiError(409, 'INVALID_TRANSITION', `A request with status ${latest.status} cannot be confirmed.`);
  }

  const seats = claimed.passengers.length;
  const flightKey = claimed.flight.flightKey;
  try {
    // 2. Take the seats: succeeds only if enough are still available at this instant.
    const inventory = await SeatInventory.findOneAndUpdate(
      { flightKey, availableSeats: { $gte: seats } }, { $inc: { availableSeats: -seats } }, { new: true },
    );
    if (!inventory) {
      const back = await BookingRequest.findOneAndUpdate(
        { _id: bookingId, status: S.ALLOCATION_IN_PROGRESS },
        { $set: { status: S.PENDING_ADMIN_APPROVAL }, $push: { history: { status: S.PENDING_ADMIN_APPROVAL, actor: 'SYSTEM', note: 'Not enough simulated seats to confirm' } } },
        { new: true },
      );
      await writeAudit(admin, 'ALLOCATION_FAILED_NO_SEATS', back || claimed, {
        previousStatus: S.ALLOCATION_IN_PROGRESS, newStatus: S.PENDING_ADMIN_APPROVAL, meta: { seatsRequested: seats, flightKey },
      });
      throw new ApiError(409, 'NO_SEATS', `Not enough simulated seats on ${claimed.flight.flightNumber} for ${seats} traveller(s). Reject the request or add inventory.`);
    }

    // 3. Record who holds the seats. A duplicate key means a retry already allocated: hand the extra seats back.
    try {
      await SeatAllocation.create({ bookingId, flightKey, seats, status: 'ACTIVE' });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      await SeatInventory.updateOne({ flightKey }, { $inc: { availableSeats: seats } });
    }

    // 4. Finalise.
    const decidedAt = new Date();
    const booking = await BookingRequest.findOneAndUpdate(
      { _id: bookingId, status: S.ALLOCATION_IN_PROGRESS },
      {
        $set: {
          status: S.CONFIRMED,
          adminDecision: { adminId: admin._id, adminName: admin.name, action: 'CONFIRM', reason: 'Simulated seat allocated', decidedAt, idempotencyKey },
        },
        $push: { history: { status: S.CONFIRMED, actor: 'ADMIN', note: `${seats} simulated seat(s) allocated` } },
      },
      { new: true },
    );
    await writeAudit(admin, 'BOOKING_CONFIRMED', booking, {
      previousStatus: S.PENDING_ADMIN_APPROVAL, newStatus: S.CONFIRMED, reason: 'Simulated seat allocated',
      meta: { seats, flightKey, seatsLeft: inventory.availableSeats, idempotencyKey },
    });
    await notifyTraveller(booking, N.BOOKING_CONFIRMED, 'Your booking is confirmed',
      `${booking.bookingReference}: ${route(booking)} is confirmed with a simulated seat. This is not an airline ticket.`);
    return { booking, alreadyConfirmed: false };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Unexpected failure mid-allocation: undo the seats and mark the booking failed.
    const released = await releaseSeats(bookingId).catch(() => 0);
    if (!released) {
      // If allocation document was never created, return the decremented seats directly to inventory
      await SeatInventory.updateOne({ flightKey }, { $inc: { availableSeats: seats } }).catch(() => {});
    }
    const failed = await BookingRequest.findOneAndUpdate(
      { _id: bookingId, status: S.ALLOCATION_IN_PROGRESS },
      { $set: { status: S.BOOKING_FAILED }, $push: { history: { status: S.BOOKING_FAILED, actor: 'SYSTEM', note: 'Allocation failed unexpectedly' } } },
      { new: true },
    );
    if (failed) {
      await writeAudit(admin, 'BOOKING_FAILED', failed, { previousStatus: S.ALLOCATION_IN_PROGRESS, newStatus: S.BOOKING_FAILED, reason: err.message });
      await notifyTraveller(failed, N.BOOKING_FAILED, 'Booking could not be completed',
        `${failed.bookingReference}: something went wrong while allocating your seat. Search again to send a new request.`);
    }
    throw err;
  }
}

export async function rejectBooking({ bookingId, admin, reason }) {
  const decidedAt = new Date();
  const booking = await BookingRequest.findOneAndUpdate(
    { _id: bookingId, status: S.PENDING_ADMIN_APPROVAL },
    {
      $set: { status: S.REJECTED, adminDecision: { adminId: admin._id, adminName: admin.name, action: 'REJECT', reason, decidedAt, idempotencyKey: null } },
      $push: { history: { status: S.REJECTED, actor: 'ADMIN', note: reason } },
    },
    { new: true },
  );
  if (!booking) {
    const latest = await load(bookingId);
    throw new ApiError(409, 'INVALID_TRANSITION',
      canTransition(latest.status, S.REJECTED) ? 'This request changed a moment ago. Refresh and try again.'
        : `A request with status ${latest.status} cannot be rejected. Only requests waiting for review can.`);
  }
  await writeAudit(admin, 'BOOKING_REJECTED', booking, { previousStatus: S.PENDING_ADMIN_APPROVAL, newStatus: S.REJECTED, reason });
  await notifyTraveller(booking, N.BOOKING_REJECTED, 'Your booking request was rejected',
    `${booking.bookingReference}: ${route(booking)} was not approved. Reason: ${reason}`);
  return { booking };
}

// Revoke applies only to a booking that was previously CONFIRMED. It is not another word for reject.
export async function revokeBooking({ bookingId, admin, reason }) {
  const decidedAt = new Date();
  const booking = await BookingRequest.findOneAndUpdate(
    { _id: bookingId, status: S.CONFIRMED },
    {
      $set: { status: S.REVOKED, adminDecision: { adminId: admin._id, adminName: admin.name, action: 'REVOKE', reason, decidedAt, idempotencyKey: null } },
      $push: { history: { status: S.REVOKED, actor: 'ADMIN', note: reason } },
    },
    { new: true },
  );
  if (!booking) {
    const latest = await load(bookingId);
    throw new ApiError(409, 'INVALID_TRANSITION', `Only confirmed bookings can be revoked. This one is ${latest.status}.`);
  }
  const seatsReleased = await releaseSeats(booking._id);
  await writeAudit(admin, 'BOOKING_REVOKED', booking, { previousStatus: S.CONFIRMED, newStatus: S.REVOKED, reason, meta: { seatsReleased } });
  await notifyTraveller(booking, N.BOOKING_REVOKED, 'Your confirmed booking was revoked',
    `${booking.bookingReference}: ${route(booking)} has been withdrawn. Reason: ${reason}`);
  return { booking, seatsReleased };
}
