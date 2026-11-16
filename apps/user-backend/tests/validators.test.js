// Run: npm test -w @flywise/user-backend   (no database or network needed)
// Checks the request rules that protect the API: what is accepted, what is rejected.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { istDay } from '@flywise/shared/time.js';
import { loginSchema, registerSchema } from '../src/validators/auth.validators.js';
import { createBookingSchema, updateBookingSchema } from '../src/validators/booking.validators.js';
import { searchSchema } from '../src/validators/flight.validators.js';
import { updateProfileSchema } from '../src/validators/user.validators.js';

const DAY_MS = 86400000;
const messages = (result) => result.error.issues.map((issue) => issue.message);

const passenger = { firstName: 'Rahul', lastName: 'Sharma', dateOfBirth: '2003-05-10', gender: 'MALE' };
const contact = { email: 'Rahul@Example.com', phone: '9876543210' };
const booking = { offerId: 'a'.repeat(24), passengers: [passenger], contact, acknowledgeSimulated: true };

test('sign-up normalises the email and refuses a role field', () => {
  const good = registerSchema.safeParse({ name: 'Rahul Sharma', email: '  RAHUL@Example.com ', password: 'Secure@123', phone: '' });
  assert.ok(good.success);
  assert.equal(good.data.email, 'rahul@example.com');

  const withRole = registerSchema.safeParse({ name: 'Rahul Sharma', email: 'r@example.com', password: 'Secure@123', role: 'ADMIN' });
  assert.ok(!withRole.success, 'unknown keys such as "role" must be rejected');

  assert.ok(!registerSchema.safeParse({ name: 'Rahul', email: 'r@example.com', password: 'short' }).success);
  assert.ok(loginSchema.safeParse({ email: 'r@example.com', password: 'x' }).success);
});

test('profile updates accept only name and phone', () => {
  assert.ok(updateProfileSchema.safeParse({ name: 'Rahul S', phone: '+919876543210' }).success);
  assert.ok(!updateProfileSchema.safeParse({ email: 'new@example.com' }).success);
  assert.ok(!updateProfileSchema.safeParse({ accountStatus: 'ACTIVE' }).success);
});

test('search applies defaults and rejects impossible trips', () => {
  const tomorrow = istDay(Date.now() + DAY_MS);
  const good = searchSchema.safeParse({ origin: 'bho', destination: 'DEL', departureDate: tomorrow });
  assert.ok(good.success);
  assert.equal(good.data.origin, 'BHO');
  assert.equal(good.data.passengers, 1);
  assert.equal(good.data.cabinClass, 'ECONOMY');
  assert.equal(good.data.preferences.priority, 'BALANCED');

  const same = searchSchema.safeParse({ origin: 'DEL', destination: 'DEL', departureDate: tomorrow });
  assert.ok(messages(same).includes('Departure and arrival airports must be different'));

  const past = searchSchema.safeParse({ origin: 'BHO', destination: 'DEL', departureDate: '2020-01-01' });
  assert.ok(messages(past).includes('Travel date cannot be in the past'));

  assert.ok(!searchSchema.safeParse({ origin: 'XXX', destination: 'DEL', departureDate: tomorrow }).success);
  assert.ok(!searchSchema.safeParse({ origin: 'BHO', destination: 'DEL', departureDate: tomorrow, passengers: 7 }).success);
  assert.ok(!searchSchema.safeParse({ origin: 'BHO', destination: 'DEL', departureDate: istDay(Date.now() + 400 * DAY_MS) }).success);
});

test('a booking request cannot carry a price, a status or extra fields', () => {
  const good = createBookingSchema.safeParse(booking);
  assert.ok(good.success);
  assert.equal(good.data.contact.email, 'rahul@example.com');

  assert.ok(!createBookingSchema.safeParse({ ...booking, price: 1 }).success, 'price is never accepted from the browser');
  assert.ok(!createBookingSchema.safeParse({ ...booking, status: 'CONFIRMED' }).success);
  assert.ok(!createBookingSchema.safeParse({ ...booking, acknowledgeSimulated: false }).success);
  assert.ok(!createBookingSchema.safeParse({ ...booking, offerId: 'not-an-id' }).success);
  assert.ok(!createBookingSchema.safeParse({ ...booking, passengers: [] }).success);
  assert.ok(!createBookingSchema.safeParse({ ...booking, passengers: [{ ...passenger, firstName: '<script>' }] }).success);
  assert.ok(!createBookingSchema.safeParse({ ...booking, passengers: [{ ...passenger, dateOfBirth: '2999-01-01' }] }).success);
});

test('a booking update needs passengers or contact, and nothing else', () => {
  assert.ok(updateBookingSchema.safeParse({ contact }).success);
  assert.ok(updateBookingSchema.safeParse({ passengers: [passenger] }).success);
  assert.ok(!updateBookingSchema.safeParse({}).success);
  assert.ok(!updateBookingSchema.safeParse({ contact, status: 'CONFIRMED' }).success);
});
