// Integration tests for automated ACID seat allocation and instant booking.
// Run with:
//   $env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/flywise_test"; npm test -w @flywise/client-backend
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

const uri = process.env.MONGODB_TEST_URI;
const skip = uri ? false : 'set MONGODB_TEST_URI to run';

let db;
let models;
let bookingService;
let S;
let testUser;

before(async () => {
  if (!uri) return;
  if (!/test/i.test(uri)) throw new Error('MONGODB_TEST_URI must point at a database with "test" in its name');
  db = await import('@flywise/shared/db.js');
  models = await import('@flywise/shared/models.js');
  ({ BOOKING_STATUS: S } = await import('@flywise/shared/constants.js'));
  bookingService = await import('../src/services/booking.service.js');
  await db.connectDB(uri);
  await db.mongoose.connection.dropDatabase();
  testUser = await models.User.create({
    name: 'Test Passenger',
    email: `test-${Date.now()}@flywise.local`,
    passwordHash: 'dummy',
    role: 'USER',
  });
});

after(async () => {
  if (!uri) return;
  await db.mongoose.connection.dropDatabase().catch(() => {});
  await db.mongoose.disconnect().catch(() => {});
});

test('instant booking confirms immediately if seats are available and decrements inventory', { skip }, async () => {
  const flightKey = `TEST-FLIGHT-${Date.now()}`;
  await models.SeatInventory.create({
    flightKey,
    flightNumber: '6E-555',
    airline: 'IndiGo',
    origin: 'DEL',
    destination: 'BOM',
    departureTime: new Date('2027-01-01T10:00:00Z'),
    totalSeats: 10,
    availableSeats: 10,
  });

  const offer = await models.FlightOffer.create({
    searchId: new db.mongoose.Types.ObjectId(),
    provider: 'REAL_SCHEDULE',
    providerOfferId: 'prov_test_1',
    flightKey,
    airline: 'IndiGo',
    flightNumber: '6E-555',
    origin: 'DEL',
    destination: 'BOM',
    departureTime: new Date('2027-01-01T10:00:00Z'),
    arrivalTime: new Date('2027-01-01T12:00:00Z'),
    durationMinutes: 120,
    stops: 0,
    pricePerPassenger: 4500,
    passengerCount: 2,
    price: 9000,
    expiresAt: new Date(Date.now() + 3600000),
  });

  const result = await bookingService.createBooking(testUser, {
    offerId: String(offer._id),
    passengers: [
      { firstName: 'Aarav', lastName: 'Patel', dateOfBirth: '1995-04-12', gender: 'MALE' },
      { firstName: 'Priya', lastName: 'Patel', dateOfBirth: '1997-08-20', gender: 'FEMALE' },
    ],
    contact: { email: 'aarav@example.com', phone: '9876543210' },
  });

  // Must be immediately CONFIRMED without manual admin review
  assert.equal(result.status, S.CONFIRMED);
  assert.equal(result.flight.flightKey, flightKey);

  // SeatInventory must reflect decrement (10 - 2 = 8)
  const updatedInv = await models.SeatInventory.findOne({ flightKey });
  assert.equal(updatedInv.availableSeats, 8);

  // Active seat allocation created
  const allocation = await models.SeatAllocation.findOne({ flightKey, status: 'ACTIVE' });
  assert.ok(allocation);
  assert.equal(allocation.seats, 2);
});

test('booking fails with 409 NO_SEATS_AVAILABLE when flight is sold out', { skip }, async () => {
  const flightKey = `SOLDOUT-FLIGHT-${Date.now()}`;
  await models.SeatInventory.create({
    flightKey,
    flightNumber: 'AI-101',
    airline: 'Air India',
    origin: 'BOM',
    destination: 'BLR',
    departureTime: new Date('2027-02-01T10:00:00Z'),
    totalSeats: 1,
    availableSeats: 0, // sold out
  });

  const offer = await models.FlightOffer.create({
    searchId: new db.mongoose.Types.ObjectId(),
    provider: 'REAL_SCHEDULE',
    providerOfferId: 'prov_soldout_1',
    flightKey,
    airline: 'Air India',
    flightNumber: 'AI-101',
    origin: 'BOM',
    destination: 'BLR',
    departureTime: new Date('2027-02-01T10:00:00Z'),
    arrivalTime: new Date('2027-02-01T11:45:00Z'),
    durationMinutes: 105,
    stops: 0,
    pricePerPassenger: 5000,
    passengerCount: 1,
    price: 5000,
    expiresAt: new Date(Date.now() + 3600000),
  });

  await assert.rejects(
    () => bookingService.createBooking(testUser, {
      offerId: String(offer._id),
      passengers: [{ firstName: 'Rohit', lastName: 'Kumar', dateOfBirth: '1990-01-01', gender: 'MALE' }],
      contact: { email: 'rohit@example.com', phone: '9876543210' },
    }),
    (err) => err.code === 'NO_SEATS_AVAILABLE',
  );
});
