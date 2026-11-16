// Fills an empty database with demo data so every screen has something to show:
// three travellers, six flights with simulated seats, and booking requests in each status.
//
//   npm run seed:demo
//
// The desk decisions are made through the real decision service, so the audit log,
// notifications and seat counts are exactly what the running app would produce.
// Safe to run twice: it stops if the demo travellers already exist.
process.env.FLYWISE_SEEDING = 'true';
import bcrypt from 'bcryptjs';
import { BOOKING_STATUS as S, NOTIFICATION_TYPE as N } from '@flywise/shared/constants.js';
import { connectDB, mongoose } from '@flywise/shared/db.js';
import {
  Admin, BookingRequest, Notification, SeatInventory, User, getSettings, nextBookingReference,
} from '@flywise/shared/models.js';
import { istDay } from '@flywise/shared/time.js';
import { config } from '../config/index.js';
import { confirmBooking, rejectBooking, revokeBooking } from '../services/decision.service.js';
import { ensureAdmin } from './seedAdmin.js';

export const DEMO_PASSWORD = 'Traveller@123';
const DAY_MS = 86400000;

const TRAVELLERS = [
  { name: 'Rahul Sharma', email: 'rahul@demo.flywise', phone: '9876543210', gender: 'MALE', dateOfBirth: '2003-05-10' },
  { name: 'Ananya Iyer', email: 'ananya@demo.flywise', phone: '9123456780', gender: 'FEMALE', dateOfBirth: '2001-11-22' },
  { name: 'Vikram Singh', email: 'vikram@demo.flywise', phone: '9988776655', gender: 'MALE', dateOfBirth: '1998-02-03' },
];

// daysAhead: departure date relative to today. seats: simulated seats (null = the default from Settings).
const FLIGHTS = [
  { airline: 'IndiGo', code: '6E', number: '6E-2031', origin: 'BHO', destination: 'DEL', departs: '06:10', minutes: 95, fare: 4849, daysAhead: 9, seats: null },
  { airline: 'Air India', code: 'AI', number: 'AI-887', origin: 'DEL', destination: 'BOM', departs: '17:15', minutes: 130, fare: 6399, daysAhead: 12, seats: null },
  { airline: 'Akasa Air', code: 'QP', number: 'QP-1123', origin: 'BLR', destination: 'GOI', departs: '09:00', minutes: 75, fare: 3699, daysAhead: 6, seats: null },
  { airline: 'IndiGo', code: '6E', number: '6E-6157', origin: 'BOM', destination: 'BHO', departs: '14:40', minutes: 100, fare: 5199, daysAhead: 15, seats: null },
  { airline: 'Air India Express', code: 'IX', number: 'IX-2210', origin: 'HYD', destination: 'MAA', departs: '19:05', minutes: 80, fare: 3949, daysAhead: 4, seats: null },
  // One seat only: two travellers are left waiting for it, for the "last seat" demonstration.
  { airline: 'SpiceJet', code: 'SG', number: 'SG-4410', origin: 'DEL', destination: 'BLR', departs: '07:25', minutes: 165, fare: 7149, daysAhead: 7, seats: 1 },
];

// [traveller index, flight index, days ago the request was sent, what happens to it]
const REQUESTS = [
  [0, 0, 9, 'confirm'], [1, 1, 8, 'confirm'], [2, 2, 7, 'reject'], [0, 3, 6, 'revoke'],
  [1, 4, 5, 'confirm'], [2, 0, 4, 'cancel'], [0, 1, 3, 'confirm'], [1, 2, 2, 'confirm'],
  [2, 3, 1, 'pending'], [0, 5, 0, 'pending'], [1, 5, 0, 'pending'],
];

function buildFlight(spec) {
  const date = istDay(Date.now() + spec.daysAhead * DAY_MS);
  const departureTime = new Date(`${date}T${spec.departs}:00+05:30`);
  const arrivalTime = new Date(departureTime.getTime() + spec.minutes * 60000);
  return {
    provider: 'MOCK',
    providerOfferId: `demo_${spec.number}_${date}`,
    flightKey: `${spec.number}_${date}`,
    airline: spec.airline, airlineCode: spec.code, flightNumber: spec.number,
    origin: spec.origin, destination: spec.destination,
    departureTime, arrivalTime, durationMinutes: spec.minutes, stops: 0,
    segments: [{ airline: spec.airline, flightNumber: spec.number, origin: spec.origin, destination: spec.destination, departureTime, arrivalTime }],
    cabinClass: 'ECONOMY', baggage: { cabin: '7 kg', checked: '15 kg' },
    currency: 'INR', pricePerPassenger: spec.fare, passengerCount: 1, price: spec.fare,
  };
}

async function createRequest(user, traveller, flight, daysAgo) {
  const createdAt = new Date(Date.now() - daysAgo * DAY_MS - 3600000);
  const [firstName, ...rest] = traveller.name.split(' ');
  const booking = await BookingRequest.create({
    bookingReference: await nextBookingReference(),
    userId: user._id,
    flight,
    passengers: [{ firstName, lastName: rest.join(' '), dateOfBirth: traveller.dateOfBirth, gender: traveller.gender }],
    contact: { email: traveller.email, phone: traveller.phone },
    pricing: { amount: flight.price, currency: 'INR', perPassenger: flight.pricePerPassenger, passengerCount: 1 },
    status: S.PENDING_ADMIN_APPROVAL,
    history: [{ status: S.PENDING_ADMIN_APPROVAL, actor: 'USER', note: 'Booking request sent', at: createdAt }],
    createdAt,
  });
  await Notification.create({
    userId: user._id, bookingId: booking._id, bookingReference: booking.bookingReference,
    type: N.BOOKING_REQUEST_CREATED, title: 'Booking request sent',
    message: `${booking.bookingReference}: your request for ${flight.origin} to ${flight.destination} is waiting for review.`,
    createdAt,
  });
  return booking;
}

async function cancelAsTraveller(booking) {
  await BookingRequest.updateOne(
    { _id: booking._id, status: S.PENDING_ADMIN_APPROVAL },
    {
      $set: { status: S.CANCELLED, cancellation: { reason: 'Plans changed', at: new Date() } },
      $push: { history: { status: S.CANCELLED, actor: 'USER', note: 'Plans changed' } },
    },
  );
  await Notification.create({
    userId: booking.userId, bookingId: booking._id, bookingReference: booking.bookingReference,
    type: N.BOOKING_CANCELLED, title: 'Booking cancelled', message: `${booking.bookingReference} has been cancelled.`,
  });
}

async function seed() {
  await connectDB(config.mongoUri);
  await ensureAdmin();
  const admin = await Admin.findOne({});
  if (!admin) throw new Error('No desk account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
  if (await User.exists({ email: TRAVELLERS[0].email })) {
    console.log('[seed:demo] Demo data is already present. Nothing was changed.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 11);
  const users = [];
  for (const t of TRAVELLERS) {
    users.push(await User.create({ name: t.name, email: t.email, phone: t.phone, passwordHash, role: 'USER' }));
  }

  const settings = await getSettings();
  const flights = FLIGHTS.map(buildFlight);
  for (const [i, flight] of flights.entries()) {
    const seats = FLIGHTS[i].seats ?? settings.defaultSimulatedSeats;
    await SeatInventory.updateOne(
      { flightKey: flight.flightKey },
      { $setOnInsert: {
        flightNumber: flight.flightNumber, airline: flight.airline, origin: flight.origin, destination: flight.destination,
        departureTime: flight.departureTime, totalSeats: seats, availableSeats: seats, inventoryMode: 'SIMULATED',
      } },
      { upsert: true },
    );
  }

  const outcomes = {};
  for (const [travellerIndex, flightIndex, daysAgo, outcome] of REQUESTS) {
    const booking = await createRequest(users[travellerIndex], TRAVELLERS[travellerIndex], flights[flightIndex], daysAgo);
    const bookingId = String(booking._id);
    if (outcome === 'confirm') await confirmBooking({ bookingId, admin });
    if (outcome === 'reject') await rejectBooking({ bookingId, admin, reason: 'The fare has expired. Please search again for a current fare.' });
    if (outcome === 'revoke') {
      await confirmBooking({ bookingId, admin });
      await revokeBooking({ bookingId, admin, reason: 'The airline cancelled this flight.' });
    }
    if (outcome === 'cancel') await cancelAsTraveller(booking);
    outcomes[outcome] = (outcomes[outcome] || 0) + 1;
  }

  console.log('[seed:demo] Done.');
  console.log(`  Travellers: ${TRAVELLERS.map((t) => t.email).join(', ')}  (password: ${DEMO_PASSWORD})`);
  console.log(`  Requests:   ${Object.entries(outcomes).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  console.log(`  Desk login: ${admin.email}  (password: ADMIN_PASSWORD from .env)`);
}

seed()
  .catch((err) => { console.error('[seed:demo] failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
