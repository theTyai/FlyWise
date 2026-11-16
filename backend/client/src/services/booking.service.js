// Booking requests from the traveller's side: create, read, update, cancel.
//
// Two rules run through this file:
//  1. Flight facts and prices always come from the server's stored offer, never from the browser.
//  2. Status changes use conditional updates ("set CANCELLED only if still PENDING"), so a
//     traveller and the desk acting at the same moment cannot both win.
import { BOOKING_STATUS as S, NOTIFICATION_TYPE as N } from '@flywise/shared/constants.js';
import { isValidId } from '@flywise/shared/db.js';
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
  await SeatInventory.updateOne(
    { flightKey: offer.flightKey },
    { $setOnInsert: {
      flightNumber: offer.flightNumber, airline: offer.airline, origin: offer.origin, destination: offer.destination,
      departureTime: offer.departureTime, totalSeats: settings.defaultSimulatedSeats,
      availableSeats: settings.defaultSimulatedSeats, inventoryMode: 'SIMULATED',
    } },
    { upsert: true },
  );
}

// ---- Create ----
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
    throw new ApiError(409, 'DUPLICATE_REQUEST', 'You already have an open request for this flight. Open My trips to see it.');
  }

  const search = await Search.findById(offer.searchId);
  const pick = search?.recommendations.find((r) => String(r.offerId) === String(offer._id));
  const flight = flightSnapshot(offer);
  await ensureInventory(offer);

  const booking = await BookingRequest.create({
    bookingReference: await nextBookingReference(),
    userId: user._id,
    searchId: offer.searchId,
    offerId: offer._id,
    recommendationCategory: pick?.category || null,
    flight,
    passengers,
    contact,
    pricing: { amount: offer.price, currency: offer.currency, perPassenger: offer.pricePerPassenger, passengerCount: offer.passengerCount },
    status: S.PENDING_ADMIN_APPROVAL,
    history: [{ status: S.PENDING_ADMIN_APPROVAL, actor: 'USER', note: 'Booking request sent' }],
  });

  await notifyUser({
    userId: user._id, booking, type: N.BOOKING_REQUEST_CREATED,
    title: 'Booking request sent',
    message: `${booking.bookingReference}: your request for ${flight.origin} to ${flight.destination} is waiting for review.`,
  });
  notifyDesk('booking:new', booking);
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

// ---- Update: passenger and contact details, only while the request is still pending ----
export async function updateBooking(user, bookingId, { passengers, contact }) {
  const current = await ownBooking(user._id, bookingId);
  if (passengers && passengers.length !== current.passengers.length) {
    throw new ApiError(400, 'PASSENGER_COUNT_MISMATCH', 'The number of travellers cannot change. Cancel this request and search again instead.');
  }
  const set = {};
  if (passengers) set.passengers = passengers;
  if (contact) set.contact = contact;
  // The status condition makes this atomic: if the desk decided a moment ago, nothing is changed.
  const booking = await BookingRequest.findOneAndUpdate(
    { _id: current._id, userId: user._id, status: S.PENDING_ADMIN_APPROVAL },
    { $set: set, $push: { history: { status: S.PENDING_ADMIN_APPROVAL, actor: 'USER', note: 'Traveller details updated' } } },
    { new: true, runValidators: true },
  );
  if (!booking) {
    throw new ApiError(409, 'NOT_EDITABLE', 'Only requests that are still waiting for review can be edited.');
  }
  notifyDesk('booking:update', booking);
  return serializeBooking(booking);
}

// Return the simulated seats exactly once: the allocation flips ACTIVE -> RELEASED atomically,
// and only the caller that flipped it adds the seats back.
async function releaseSeats(bookingId) {
  const allocation = await SeatAllocation.findOneAndUpdate(
    { bookingId, status: 'ACTIVE' }, { $set: { status: 'RELEASED', releasedAt: new Date() } },
  );
  if (allocation) {
    await SeatInventory.updateOne({ flightKey: allocation.flightKey }, { $inc: { availableSeats: allocation.seats } });
  }
}

// ---- Delete (soft): cancel. History is kept; nothing is erased. ----
export async function cancelBooking(user, bookingId, reason = '') {
  const current = await ownBooking(user._id, bookingId);
  const cancelUpdate = {
    $set: { status: S.CANCELLED, cancellation: { reason, at: new Date() } },
    $push: { history: { status: S.CANCELLED, actor: 'USER', note: reason || 'Cancelled by traveller' } },
  };
  const cancelFrom = (status) => BookingRequest.findOneAndUpdate(
    { _id: current._id, userId: user._id, status }, cancelUpdate, { new: true },
  );

  // A pending request holds no seats. A confirmed booking does, so they go back to inventory.
  let booking = await cancelFrom(S.PENDING_ADMIN_APPROVAL);
  if (!booking) {
    booking = await cancelFrom(S.CONFIRMED);
    if (booking) await releaseSeats(booking._id);
  }
  if (!booking) {
    const latest = await BookingRequest.findById(current._id);
    // Cancelling twice (a double click, a retry) returns the same result instead of an error.
    if (latest.status === S.CANCELLED) return { booking: serializeBooking(latest), alreadyCancelled: true };
    throw new ApiError(409, 'NOT_CANCELLABLE', 'This booking can no longer be cancelled.');
  }

  await notifyUser({
    userId: user._id, booking, type: N.BOOKING_CANCELLED,
    title: 'Booking cancelled',
    message: `${booking.bookingReference} has been cancelled.`,
  });
  notifyDesk('booking:update', booking);
  return { booking: serializeBooking(booking) };
}
