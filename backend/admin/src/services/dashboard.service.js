// Numbers for the desk overview, computed with MongoDB aggregations at request time.
import { BOOKING_STATUS as S, STORED_STATUSES } from '@flywise/shared/constants.js';
import { BookingRequest, SeatInventory, User } from '@flywise/shared/models.js';
import { istDay } from '@flywise/shared/time.js';
import { bookingSummary } from '../utils/serializers.js';

const DAYS = 14; // length of the "requests per day" chart
const DAY_MS = 86400000;

export async function getDashboard() {
  const firstDay = istDay(Date.now() - (DAYS - 1) * DAY_MS);
  const since = new Date(`${firstDay}T00:00:00+05:30`);

  const [byStatus, perDay, topRoutes, topAirlines, seats, recentBookings, travellers] = await Promise.all([
    BookingRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$pricing.amount' } } }]),
    BookingRequest.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
    ]),
    BookingRequest.aggregate([
      { $group: { _id: { origin: '$flight.origin', destination: '$flight.destination' }, count: { $sum: 1 } } },
      { $sort: { count: -1, '_id.origin': 1 } }, { $limit: 6 },
    ]),
    BookingRequest.aggregate([
      { $group: { _id: '$flight.airline', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 5 },
    ]),
    SeatInventory.aggregate([{ $group: { _id: null, available: { $sum: '$availableSeats' }, total: { $sum: '$totalSeats' }, flights: { $sum: 1 } } }]),
    BookingRequest.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name email phone'),
    User.countDocuments({}),
  ]);

  // Every status appears in the result, even with a count of zero.
  const counts = Object.fromEntries(STORED_STATUSES.map((status) => [status, 0]));
  let total = 0;
  let confirmedAmount = 0;
  for (const row of byStatus) {
    counts[row._id] = row.count;
    total += row.count;
    if (row._id === S.CONFIRMED) confirmedAmount = row.amount;
  }

  // Approval rate / confirmation rate
  const decided = counts[S.CONFIRMED] + counts[S.REJECTED] + counts[S.REVOKED];
  const dayCounts = Object.fromEntries(perDay.map((d) => [d._id, d.count]));
  const requestsPerDay = Array.from({ length: DAYS }, (_, i) => {
    const date = istDay(since.getTime() + i * DAY_MS);
    return { date, count: dayCounts[date] || 0 };
  });

  return {
    totals: {
      total,
      pending: counts[S.PENDING_ADMIN_APPROVAL] + counts[S.ALLOCATION_IN_PROGRESS] + counts[S.PRICE_REVALIDATION],
      confirmed: counts[S.CONFIRMED],
      rejected: counts[S.REJECTED],
      cancelled: counts[S.CANCELLED],
      revoked: counts[S.REVOKED],
      failed: counts[S.BOOKING_FAILED],
      travellers,
    },
    approvalRate: total ? Math.round((counts[S.CONFIRMED] / total) * 100) : 100,
    confirmedValue: confirmedAmount,
    seats: { available: seats[0]?.available || 0, total: seats[0]?.total || 0, flights: seats[0]?.flights || 0 },
    statusCounts: counts,
    requestsPerDay,
    topRoutes: topRoutes.map((r) => ({ origin: r._id.origin, destination: r._id.destination, count: r.count })),
    topAirlines: topAirlines.map((a) => ({ airline: a._id, count: a.count })),
    recentBookings: recentBookings.map(bookingSummary),
    oldestPending: recentBookings.filter((b) => b.status === S.PENDING_ADMIN_APPROVAL).slice(0, 5).map(bookingSummary),
  };
}
