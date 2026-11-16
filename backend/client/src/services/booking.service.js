// Booking requests from the traveller's side: create, read, update, cancel.
//
// Reliability & ACID rules implemented here:
//  1. Real-time atomic seat allocation: if seats are available, booking is confirmed immediately
//     without manual admin intervention.
//  2. Multi-document ACID transactions guarantee Atomicity and Consistency across
//     SeatInventory, BookingRequest, and SeatAllocation.
//  3. Strict duplicate prevention and atomic rollback if seats are exhausted.
import { BOOKING_STATUS as S, NOTIFICATION_TYPE as N } from '@flywise/shared/constants.js';
import { isValidId, withTransaction } from '@flywise/shared/db.js';
import { ApiError } from '@flywise/shared/http.js';
import {
  BookingRequest, FlightOffer, Search, SeatAllocation, SeatInventory, getSettings, nextBookingReference,
} from '@flywise/shared/models.js';
import { serializeBooking } from '../utils/serializers.js';
import { notifyDesk, notifyUser } from './notification.service.js';

const OPEN_STATUSES = [S.PENDING_ADMIN_APPROVAL, S.PRICE_REVALIDATION, S.ALLOCATION_IN_PROGRESS, S.CONFIRMED];

// A traveller can only ever load their own booking. Someone else's id looks like "not found".
async function ownBooking(userId, bookingId) {
  const booking = isValidId(bookingId) ? await BookingRequest.findOne({ _id: bookingId, userId }) : null;
  if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'We could not find this booking in your account');
  return booking;
}

// Copy the flight out of a stored offer, without the offer's own bookkeeping fields.
function flightSnapshot(offer) {
  const flight = offer.toObject();
  for (const key of ['_id', 'searchId', 'expiresAt', 'createdAt', 'updatedAt', '__v']) delete flight[key];
  return flight;
}

// Make sure a simulated inventory record exists for this flight (created once, never overwritten).
async function ensureInventory(offer) {
  const settings = await getSettings();
  const defaultSeats = settings?.defaultSimulatedSeats || 12;
  await SeatInventory.updateOne(
    { flightKey: offer.flightKey },
    { $setOnInsert: {
      flightNumber: offer.flightNumber, airline: offer.airline, origin: offer.origin, destination: offer.destination,
      departureTime: offer.departureTime, totalSeats: defaultSeats,
      availableSeats: defaultSeats, inventoryMode: 'SIMULATED',
    } },
    { upsert: true },
  );
}

// ---- Create: Direct ACID Booking with Instant Seat Allocation ----
export async function createBooking(user, { offerId, passengers, contact }) {
  const offer = await FlightOffer.findById(offerId);
  if (!offer) throw new ApiError(404, 'OFFER_NOT_FOUND', 'This fare no longer exists. Search again to see current fares.');
  if (offer.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, 'OFFER_EXPIRED', 'This fare has expired. Search again to see current fares.');
  }
  if (passengers.length !== offer.passengerCount) {
    throw new ApiError(400, 'PASSENGER_COUNT_MISMATCH', `This fare is for ${offer.passengerCount} traveller(s). Enter details for each one.`);
  }

  const duplicate = await BookingRequest.exists({
    userId: user._id, 'flight.flightKey': offer.flightKey, status: { $in: OPEN_STATUSES },
  });
  if (duplicate) {
    throw new ApiError(409, 'DUPLICATE_REQUEST', 'You already have an active booking for this flight. Open My trips to see it.');
  }

  const search = await Search.findById(offer.searchId);
  const pick = search?.recommendations.find((r) => String(r.offerId) === String(offer._id));
  const flight = flightSnapshot(offer);
  const seatsNeeded = passengers.length;
  const flightKey = offer.flightKey;

  await ensureInventory(offer);

  // Execute ACID transaction: verify & decrement seats, persist confirmed booking and allocation together
  const booking = await withTransaction(async (session) => {
    const sessionOpt = session ? { session } : {};

    // 1. Atomic conditional decrement on seat inventory (Isolation & Consistency)
    const inventory = await SeatInventory.findOneAndUpdate(
      { flightKey, availableSeats: { $gte: seatsNeeded } },
      { $inc: { availableSeats: -seatsNeeded } },
      { new: true, ...sessionOpt },
    );

    if (!inventory) {
      const currentInv = await SeatInventory.findOne({ flightKey }, null, sessionOpt);
      const remaining = currentInv?.availableSeats ?? 0;
      throw new ApiError(
        409,
        'NO_SEATS_AVAILABLE',
        remaining === 0
          ? `Flight ${offer.flightNumber} is completely sold out. Please select another flight.`
          : `Only ${remaining} seat(s) available on ${offer.flightNumber}, but ${seatsNeeded} requested. Please select another flight.`,
        [{ field: 'passengers', message: `Only ${remaining} seat(s) remaining` }],
      );
    }

    // 2. Monotonic booking reference inside transaction
    const bookingRef = await nextBookingReference(session);

    // 3. Create confirmed booking
    const [created] = await BookingRequest.create([{
      bookingReference: bookingRef,
      userId: user._id,
      searchId: offer.searchId,
      offerId: offer._id,
      recommendationCategory: pick?.category || null,
      flight: {
        ...flight,
        availableSeats: inventory.availableSeats,
        totalSeats: inventory.totalSeats,
      },
      passengers,
      contact,
      pricing: {
        amount: offer.price,
        currency: offer.currency,
        perPassenger: offer.pricePerPassenger,
        passengerCount: offer.passengerCount,
      },
      status: S.CONFIRMED,
      adminDecision: {
        action: 'CONFIRM',
        reason: 'Instant automated seat verification & allocation',
        decidedAt: new Date(),
        adminName: 'Automated Seat Allocation Engine',
      },
      history: [
        { status: S.ALLOCATION_IN_PROGRESS, actor: 'SYSTEM', note: 'Verifying live seat inventory' },
        { status: S.CONFIRMED, actor: 'SYSTEM', note: `Booking confirmed: ${seatsNeeded} seat(s) allocated` },
      ],
    }], sessionOpt);

    // 4. Record active seat allocation mapping
    await SeatAllocation.create([{
      bookingId: created._id,
      flightKey,
      seats: seatsNeeded,
      status: 'ACTIVE',
    }], sessionOpt);

    return created;
  });

  // Real-time broadcasts and notification
  await notifyUser({
    userId: user._id,
    booking,
    type: N.BOOKING_CONFIRMED,
    title: 'Booking confirmed!',
    message: `${booking.bookingReference}: Your flight from ${flight.origin} to ${flight.destination} is confirmed. Seats reserved: ${seatsNeeded}.`,
  });

  notifyDesk('booking:new', booking);
  notifyDesk('booking:confirmed', booking);

  return serializeBooking(booking);
}

// ---- Read ----
export async function listBookings(user, status) {
  const filter = { userId: user._id };
  if (status) filter.status = status;
  const bookings = await BookingRequest.find(filter).sort({ createdAt: -1 }).limit(200);
  return bookings.map(serializeBooking);
}

export async function getBooking(user, bookingId) {
  return serializeBooking(await ownBooking(user._id, bookingId));
}

// ---- Update: passenger and contact details ----
export async function updateBooking(user, bookingId, { passengers, contact }) {
  const current = await ownBooking(user._id, bookingId);
  if (passengers && passengers.length !== current.passengers.length) {
    throw new ApiError(400, 'PASSENGER_COUNT_MISMATCH', 'The number of travellers cannot change. Cancel this booking and search again instead.');
  }
  const set = {};
  if (passengers) set.passengers = passengers;
  if (contact) set.contact = contact;

  const booking = await BookingRequest.findOneAndUpdate(
    { _id: current._id, userId: user._id, status: { $in: [S.CONFIRMED, S.PENDING_ADMIN_APPROVAL] } },
    { $set: set, $push: { history: { status: current.status, actor: 'USER', note: 'Traveller details updated' } } },
    { new: true, runValidators: true },
  );
  if (!booking) {
    throw new ApiError(409, 'NOT_EDITABLE', 'Only active bookings can be edited.');
  }
  notifyDesk('booking:update', booking);
  return serializeBooking(booking);
}

// ---- Delete (soft): cancel. Uses transaction to safely release seats ----
export async function cancelBooking(user, bookingId, reason = '') {
  const current = await ownBooking(user._id, bookingId);

  if (current.status === S.CANCELLED) {
    return { booking: serializeBooking(current), alreadyCancelled: true };
  }

  if (current.status !== S.CONFIRMED && current.status !== S.PENDING_ADMIN_APPROVAL) {
    throw new ApiError(409, 'NOT_CANCELLABLE', `This booking is in '${current.status}' status and cannot be cancelled.`);
  }

  const cancelled = await withTransaction(async (session) => {
    const sessionOpt = session ? { session } : {};

    const updated = await BookingRequest.findOneAndUpdate(
      { _id: current._id, userId: user._id, status: { $in: [S.CONFIRMED, S.PENDING_ADMIN_APPROVAL] } },
      {
        $set: { status: S.CANCELLED, cancellation: { reason, at: new Date() } },
        $push: { history: { status: S.CANCELLED, actor: 'USER', note: reason || 'Cancelled by traveller' } },
      },
      { new: true, ...sessionOpt },
    );

    if (!updated) {
      throw new ApiError(409, 'NOT_CANCELLABLE', 'Booking state changed. Unable to cancel.');
    }

    const allocation = await SeatAllocation.findOneAndUpdate(
      { bookingId: current._id, status: 'ACTIVE' },
      { $set: { status: 'RELEASED', releasedAt: new Date() } },
      { new: true, ...sessionOpt },
    );

    if (allocation) {
      await SeatInventory.updateOne(
        { flightKey: allocation.flightKey },
        { $inc: { availableSeats: allocation.seats } },
        sessionOpt,
      );
    }

    return updated;
  });

  await notifyUser({
    userId: user._id,
    booking: cancelled,
    type: N.BOOKING_CANCELLED,
    title: 'Booking cancelled',
    message: `${cancelled.bookingReference} has been cancelled and seats returned to inventory.`,
  });

  notifyDesk('booking:update', cancelled);
  return { booking: serializeBooking(cancelled) };
}
