// Read side of booking requests for the desk: the searchable list and the detail view.
// The write side (confirm / reject / revoke) lives in decision.service.js.
import { isValidId } from '@flywise/shared/db.js';
import { ApiError, escapeRegex } from '@flywise/shared/http.js';
import { AuditLog, BookingRequest, SeatAllocation, SeatInventory, User } from '@flywise/shared/models.js';
import { bookingDetail, bookingSummary } from '../utils/serializers.js';

export async function listBookings({ status, q, skip, limit }) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    // The search box matches a reference, flight, airline, airport code, or the traveller's name/email.
    const pattern = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').limit(50);
    filter.$or = [
      { bookingReference: pattern }, { 'flight.flightNumber': pattern }, { 'flight.airline': pattern },
      { 'flight.origin': q.toUpperCase() }, { 'flight.destination': q.toUpperCase() },
      { userId: { $in: users.map((u) => u._id) } },
    ];
  }
  const [bookings, total] = await Promise.all([
    BookingRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email phone'),
    BookingRequest.countDocuments(filter),
  ]);
  return { bookings: bookings.map(bookingSummary), total };
}

// The booking plus what the desk needs to decide it: seat inventory for its flight,
// the allocation (if it was ever confirmed) and the audit entries about it.
export async function getBookingDetail(id) {
  const booking = isValidId(id) ? await BookingRequest.findById(id).populate('userId', 'name email phone') : null;
  if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking request not found');
  const [inventory, allocation, audit] = await Promise.all([
    SeatInventory.findOne({ flightKey: booking.flight.flightKey }),
    SeatAllocation.findOne({ bookingId: booking._id }),
    AuditLog.find({ bookingId: booking._id }).sort({ timestamp: -1 }).limit(30),
  ]);
  return {
    booking: bookingDetail(booking),
    inventory: inventory
      ? { id: String(inventory._id), flightKey: inventory.flightKey, totalSeats: inventory.totalSeats, availableSeats: inventory.availableSeats, inventoryMode: inventory.inventoryMode }
      : null,
    allocation: allocation ? { seats: allocation.seats, status: allocation.status, releasedAt: allocation.releasedAt || null } : null,
    audit: audit.map((a) => ({ id: String(a._id), action: a.action, actorName: a.actorName, reason: a.reason || '', timestamp: a.timestamp })),
  };
}
