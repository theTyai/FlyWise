// Integration tests for the booking decisions against a real MongoDB.
// They are skipped unless MONGODB_TEST_URI is set, because they create and drop data:
//
//   Windows (PowerShell):  $env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/flywise_test"; npm test -w @flywise/admin-backend
//   macOS / Linux:         MONGODB_TEST_URI=mongodb://127.0.0.1:27017/flywise_test npm test -w @flywise/admin-backend
//
// Use a database name that is NOT your development database - it is dropped at the end.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

const uri = process.env.MONGODB_TEST_URI;
const skip = uri ? false : 'set MONGODB_TEST_URI to run';

let db; let models; let decisions; let S;
const admin = { _id: null, name: 'Test Admin' };
let counter = 0;

async function makeBooking(flightKey, passengers = 1) {
  counter += 1;
  return models.BookingRequest.create({
    bookingReference: `TEST-${Date.now()}-${counter}`,
    userId: new db.mongoose.Types.ObjectId(),
    flight: {
      provider: 'MOCK', providerOfferId: `mock_${counter}`, flightKey, airline: 'Test Air', flightNumber: 'TA-1',
      origin: 'BHO', destination: 'DEL', departureTime: new Date('2031-01-01T03:00:00Z'), arrivalTime: new Date('2031-01-01T04:30:00Z'),
      durationMinutes: 90, stops: 0, pricePerPassenger: 4000, passengerCount: passengers, price: 4000 * passengers,
    },
    passengers: Array.from({ length: passengers }, (_, i) => ({ firstName: 'Test', lastName: `P${i}`, dateOfBirth: '2000-01-01', gender: 'OTHER' })),
    contact: { email: 't@example.com', phone: '9999999999' },
    pricing: { amount: 4000 * passengers, currency: 'INR', perPassenger: 4000, passengerCount: passengers },
    status: S.PENDING_ADMIN_APPROVAL,
  });
}

const makeInventory = (flightKey, seats) => models.SeatInventory.create({
  flightKey, flightNumber: 'TA-1', origin: 'BHO', destination: 'DEL', totalSeats: seats, availableSeats: seats,
});

before(async () => {
  if (!uri) return;
  if (!/test/i.test(uri)) throw new Error('MONGODB_TEST_URI must point at a database with "test" in its name');
  db = await import('@flywise/shared/db.js');
  models = await import('@flywise/shared/models.js');
  ({ BOOKING_STATUS: S } = await import('@flywise/shared/constants.js'));
  decisions = await import('../src/services/decision.service.js');
  await db.connectDB(uri);
  await db.mongoose.connection.dropDatabase();
  await Promise.all(Object.values(models).filter((m) => typeof m?.syncIndexes === 'function').map((m) => m.syncIndexes()));
  admin._id = new db.mongoose.Types.ObjectId();
});

after(async () => {
  if (!uri) return;
  await db.mongoose.connection.dropDatabase();
  await db.mongoose.disconnect();
});

test('two requests for the last seat: only one allocation succeeds', { skip }, async () => {
  const key = 'TA-1_last-seat';
  await makeInventory(key, 1);
  const [a, b] = await Promise.all([makeBooking(key), makeBooking(key)]);
  const results = await Promise.allSettled([
    decisions.confirmBooking({ bookingId: a._id, admin }),
    decisions.confirmBooking({ bookingId: b._id, admin }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = results.find((r) => r.status === 'rejected');
  assert.equal(rejected.reason.code, 'NO_SEATS');

  const statuses = (await models.BookingRequest.find({ 'flight.flightKey': key })).map((x) => x.status).sort();
  assert.deepEqual(statuses, [S.CONFIRMED, S.PENDING_ADMIN_APPROVAL].sort());
  assert.equal((await models.SeatInventory.findOne({ flightKey: key })).availableSeats, 0);
  assert.equal(await models.SeatAllocation.countDocuments({ flightKey: key, status: 'ACTIVE' }), 1);
});

test('duplicate confirmation does not allocate twice', { skip }, async () => {
  const key = 'TA-1_duplicate';
  await makeInventory(key, 5);
  const booking = await makeBooking(key, 2);
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => decisions.confirmBooking({ bookingId: booking._id, admin, idempotencyKey: 'same-key' })),
  );
  assert.ok(results.some((r) => r.status === 'fulfilled'));
  for (const r of results.filter((x) => x.status === 'rejected')) assert.equal(r.reason.code, 'IN_PROGRESS');
  const again = await decisions.confirmBooking({ bookingId: booking._id, admin });
  assert.equal(again.alreadyConfirmed, true);
  assert.equal((await models.SeatInventory.findOne({ flightKey: key })).availableSeats, 3);
  assert.equal(await models.SeatAllocation.countDocuments({ bookingId: booking._id }), 1);
  assert.equal(await models.AuditLog.countDocuments({ bookingId: booking._id, action: 'BOOKING_CONFIRMED' }), 1);
});

test('reject needs a pending request; revoke needs a confirmed one and releases seats', { skip }, async () => {
  const key = 'TA-1_lifecycle';
  await makeInventory(key, 2);
  const booking = await makeBooking(key);

  await assert.rejects(decisions.revokeBooking({ bookingId: booking._id, admin, reason: 'not confirmed yet' }), { code: 'INVALID_TRANSITION' });
  await decisions.confirmBooking({ bookingId: booking._id, admin });
  await assert.rejects(decisions.rejectBooking({ bookingId: booking._id, admin, reason: 'too late to reject' }), { code: 'INVALID_TRANSITION' });
  assert.equal((await models.SeatInventory.findOne({ flightKey: key })).availableSeats, 1);

  const { seatsReleased } = await decisions.revokeBooking({ bookingId: booking._id, admin, reason: 'Airline cancelled the flight' });
  assert.equal(seatsReleased, 1);
  assert.equal((await models.SeatInventory.findOne({ flightKey: key })).availableSeats, 2);
  assert.equal((await models.BookingRequest.findById(booking._id)).status, S.REVOKED);
  assert.equal(await decisions.releaseSeats(booking._id), 0, 'seats are released only once');

  const other = await makeBooking(key);
  await decisions.rejectBooking({ bookingId: other._id, admin, reason: 'Fare no longer available' });
  assert.equal((await models.BookingRequest.findById(other._id)).status, S.REJECTED);
  assert.ok(await models.Notification.countDocuments({ bookingId: other._id, type: 'BOOKING_REJECTED' }));
  assert.ok(await models.AuditLog.countDocuments({ bookingId: other._id, action: 'BOOKING_REJECTED' }));
});
