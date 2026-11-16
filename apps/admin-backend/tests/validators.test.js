// Run: npm test -w @flywise/admin-backend   (no database or network needed)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listBookingsSchema, reasonSchema } from '../src/validators/booking.validators.js';
import { createInventorySchema, updateInventorySchema } from '../src/validators/inventory.validators.js';
import { settingsSchema } from '../src/validators/settings.validators.js';
import { accountStatusSchema } from '../src/validators/user.validators.js';

test('rejecting or revoking needs a real reason', () => {
  assert.ok(reasonSchema.safeParse({ reason: 'No simulated seats left on this flight.' }).success);
  assert.ok(!reasonSchema.safeParse({ reason: 'no' }).success);
  assert.ok(!reasonSchema.safeParse({ reason: '     ' }).success);
  assert.ok(!reasonSchema.safeParse({}).success);
});

test('the request list accepts only known statuses', () => {
  assert.ok(listBookingsSchema.safeParse({ status: 'CONFIRMED', q: 'FWB-2026', page: '2', limit: '15' }).success);
  assert.ok(listBookingsSchema.safeParse({}).success);
  assert.ok(!listBookingsSchema.safeParse({ status: 'DELETED' }).success);
});

test('inventory records need a valid flight, route and seat total', () => {
  const record = { flightNumber: '6e-201', origin: 'bho', destination: 'DEL', date: '2030-01-15', totalSeats: '60' };
  const good = createInventorySchema.safeParse(record);
  assert.ok(good.success);
  assert.equal(good.data.flightNumber, '6E-201');
  assert.equal(good.data.origin, 'BHO');
  assert.equal(good.data.totalSeats, 60);

  assert.ok(!createInventorySchema.safeParse({ ...record, destination: 'BHO' }).success, 'same origin and destination');
  assert.ok(!createInventorySchema.safeParse({ ...record, flightNumber: 'INDIGO201' }).success);
  assert.ok(!createInventorySchema.safeParse({ ...record, totalSeats: 501 }).success);
  assert.ok(!createInventorySchema.safeParse({ ...record, availableSeats: 999 }).success, 'available seats cannot be set directly');
  assert.ok(!updateInventorySchema.safeParse({ totalSeats: -1 }).success);
});

test('settings and account status accept only their documented values', () => {
  assert.ok(settingsSchema.safeParse({ defaultSimulatedSeats: 12 }).success);
  assert.ok(!settingsSchema.safeParse({ defaultSimulatedSeats: 1000 }).success);
  assert.ok(accountStatusSchema.safeParse({ accountStatus: 'SUSPENDED' }).success);
  assert.ok(!accountStatusSchema.safeParse({ accountStatus: 'DELETED' }).success);
  assert.ok(!accountStatusSchema.safeParse({ accountStatus: 'ACTIVE', role: 'ADMIN' }).success);
});
