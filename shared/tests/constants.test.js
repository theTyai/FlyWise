import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AIRPORTS, BOOKING_STATUS as S, STATUS_META, STORED_STATUSES, TERMINAL_STATUSES, TRANSITIONS, canTransition,
} from '../constants.js';
import { corsOptions, escapeRegex, isAllowedOrigin, paginate, redact, sanitizeRequest } from '../http.js';

test('booking state machine allows only the documented transitions', () => {
  assert.ok(canTransition(S.PENDING_ADMIN_APPROVAL, S.ALLOCATION_IN_PROGRESS));
  assert.ok(canTransition(S.ALLOCATION_IN_PROGRESS, S.CONFIRMED));
  assert.ok(canTransition(S.PENDING_ADMIN_APPROVAL, S.REJECTED));
  assert.ok(canTransition(S.PENDING_ADMIN_APPROVAL, S.CANCELLED));
  assert.ok(canTransition(S.CONFIRMED, S.REVOKED));
  assert.ok(canTransition(S.CONFIRMED, S.CANCELLED));

  assert.ok(!canTransition(S.PENDING_ADMIN_APPROVAL, S.CONFIRMED), 'confirmation must pass through allocation');
  assert.ok(!canTransition(S.PENDING_ADMIN_APPROVAL, S.REVOKED), 'revoke is only for confirmed bookings');
  assert.ok(!canTransition(S.CONFIRMED, S.REJECTED), 'reject is only for pending requests');
  assert.ok(!canTransition(S.REJECTED, S.CONFIRMED));
  assert.ok(!canTransition(S.CANCELLED, S.PENDING_ADMIN_APPROVAL));
  assert.ok(!canTransition('NOT_A_STATUS', S.CONFIRMED));
});

test('terminal statuses have no way out and every status is described', () => {
  assert.deepEqual([...TERMINAL_STATUSES].sort(), [S.BOOKING_FAILED, S.CANCELLED, S.REJECTED, S.REVOKED].sort());
  for (const status of Object.values(S)) assert.ok(status in TRANSITIONS, `${status} missing from TRANSITIONS`);
  for (const targets of Object.values(TRANSITIONS)) for (const t of targets) assert.ok(t in TRANSITIONS);
  for (const status of STORED_STATUSES) assert.ok(STATUS_META[status]?.label, `${status} has no label`);
});

test('airport list has unique valid IATA codes', () => {
  const codes = AIRPORTS.map((a) => a.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const a of AIRPORTS) {
    assert.match(a.code, /^[A-Z]{3}$/);
    assert.ok(a.lat > 5 && a.lat < 38 && a.lon > 68 && a.lon < 98, `${a.code} coordinates are outside India`);
  }
});

test('request sanitiser removes MongoDB operators and dotted keys', () => {
  const req = { body: { email: { $ne: null }, nested: { 'a.b': 1, ok: [{ $gt: 1, keep: 2 }] } }, query: { $where: 'x' }, params: {} };
  sanitizeRequest(req, null, () => {});
  assert.deepEqual(req.body, { email: {}, nested: { ok: [{ keep: 2 }] } });
  assert.deepEqual(req.query, {});
});

test('log redaction, regex escaping and pagination helpers', () => {
  assert.deepEqual(redact({ email: 'a@b.c', password: 'x', passengers: [{ firstName: 'A' }], contact: { phone: '99', city: 'Bhopal' } }),
    { email: 'a@b.c', password: '[redacted]', passengers: '[redacted]', contact: { phone: '[redacted]', city: 'Bhopal' } });
  assert.equal(new RegExp(escapeRegex('a.b*(c)')).test('a.b*(c)'), true);
  assert.equal(new RegExp(escapeRegex('.*')).test('anything'), false);
  assert.deepEqual(paginate({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
  assert.deepEqual(paginate({ page: '-1', limit: '9999' }), { page: 1, limit: 100, skip: 0 });
});

test('cors and origin validation permits localhost, 127.0.0.1, IPv6 loopback, and LAN IPs', () => {
  assert.equal(isAllowedOrigin(undefined), true);
  assert.equal(isAllowedOrigin(''), true);
  assert.equal(isAllowedOrigin('http://localhost:5173'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
  assert.equal(isAllowedOrigin('http://[::1]:5173'), true);
  assert.equal(isAllowedOrigin('http://192.168.1.100:5173'), true);
  assert.equal(isAllowedOrigin('http://custom-domain.com', ['http://custom-domain.com']), true);
  assert.equal(isAllowedOrigin('http://unauthorized-domain.com', ['http://custom-domain.com']), false);

  const options = corsOptions(['http://custom-domain.com']);
  options.origin('http://127.0.0.1:5173', (err, allow) => {
    assert.equal(err, null);
    assert.equal(allow, true);
  });
  options.origin('http://evil.com', (err, allow) => {
    assert.equal(err, null);
    assert.equal(allow, false);
  });
});
