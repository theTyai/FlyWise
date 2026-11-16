// Run: npm test -w @flywise/client-backend   (no database or network needed)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AIRPORT_CODES } from '@flywise/shared/constants.js';
import { isoDurationToMinutes, normaliseDuffelOffer } from '../src/integrations/flight-provider/duffelProvider.js';
import { generateMockOffers } from '../src/integrations/flight-provider/mockProvider.js';
import { searchRealSchedules, realScheduleProvider } from '../src/integrations/flight-provider/realScheduleProvider.js';
import { fallbackRecommendations } from '../src/services/fallbackRanking.service.js';

const query = { origin: 'BHO', destination: 'DEL', departureDate: '2030-11-25', passengers: 2, cabinClass: 'ECONOMY' };
const NOW = new Date('2030-10-01T00:00:00Z');

test('sample provider returns well-formed offers labelled MOCK', () => {
  const offers = generateMockOffers(query, NOW);
  assert.ok(offers.length >= 9, 'expected a realistic number of flights');
  for (const offer of offers) {
    assert.equal(offer.provider, 'MOCK');
    assert.equal(offer.origin, 'BHO');
    assert.equal(offer.destination, 'DEL');
    assert.ok(offer.arrivalTime > offer.departureTime);
    assert.equal(Math.round((offer.arrivalTime - offer.departureTime) / 60000), offer.durationMinutes);
    assert.ok(offer.pricePerPassenger > 0);
    assert.equal(offer.price, offer.pricePerPassenger * 2);
    assert.equal(offer.segments.length, offer.stops + 1);
    assert.ok(offer.expiresAt > NOW);
    assert.ok(offer.flightKey.endsWith('_2030-11-25'));
  }
  assert.equal(new Set(offers.map((o) => o.flightKey)).size, offers.length, 'flight keys are unique');
  assert.ok(offers.some((o) => o.stops === 0) && offers.some((o) => o.stops === 1));
});

test('sample provider is deterministic for a route and date', () => {
  const a = generateMockOffers(query, NOW).map((o) => `${o.flightKey}:${o.pricePerPassenger}`);
  const b = generateMockOffers(query, NOW).map((o) => `${o.flightKey}:${o.pricePerPassenger}`);
  assert.deepEqual(a, b);
  const other = generateMockOffers({ ...query, departureDate: '2030-11-26' }, NOW).map((o) => o.flightKey);
  assert.notDeepEqual(a.map((x) => x.split(':')[0]), other);
});

test('sample provider handles every supported airport pair and rejects bad input', () => {
  for (const origin of AIRPORT_CODES.slice(0, 8)) {
    for (const destination of AIRPORT_CODES.slice(4, 12)) {
      if (origin === destination) continue;
      assert.ok(generateMockOffers({ ...query, origin, destination }, NOW).length >= 8, `${origin}-${destination}`);
    }
  }
  assert.deepEqual(generateMockOffers({ ...query, destination: 'BHO' }, NOW), []);
  assert.deepEqual(generateMockOffers({ ...query, origin: 'XXX' }, NOW), []);
});

test('real-schedule provider generates realistic flights with authentic airline carriers', async () => {
  const offers = await realScheduleProvider.search(query, NOW);
  assert.ok(offers.length >= 4, 'expected real timetable offers');
  for (const offer of offers) {
    assert.equal(offer.provider, 'REAL_SCHEDULE');
    assert.equal(offer.origin, 'BHO');
    assert.equal(offer.destination, 'DEL');
    assert.ok(['IndiGo', 'Air India', 'Vistara', 'Akasa Air', 'SpiceJet', 'Air India Express'].includes(offer.airline));
    assert.ok(offer.flightNumber.includes('-'));
    assert.ok(offer.pricePerPassenger > 1000);
    assert.equal(offer.price, offer.pricePerPassenger * 2);
    assert.ok(offer.durationMinutes > 30);
    assert.ok(offer.baggage.cabin && offer.baggage.checked);
    assert.equal(offer.segments.length, offer.stops + 1);
    assert.ok(offer.expiresAt > NOW);
  }
  assert.equal(new Set(offers.map((o) => o.flightKey)).size, offers.length, 'unique flight keys');
});

test('Duffel offers are converted to the internal flight shape', () => {
  assert.equal(isoDurationToMinutes('PT2H35M'), 155);
  assert.equal(isoDurationToMinutes('P1DT1H'), 1500);
  const offer = normaliseDuffelOffer({
    id: 'off_123', total_amount: '8400.00', total_currency: 'INR', expires_at: '2030-10-01T01:00:00Z',
    slices: [{ duration: 'PT1H30M', segments: [{
      departing_at: '2030-11-25T08:30:00', arriving_at: '2030-11-25T10:00:00',
      origin: { iata_code: 'BHO' }, destination: { iata_code: 'DEL' },
      marketing_carrier: { name: 'IndiGo', iata_code: '6E' }, marketing_carrier_flight_number: '201',
      passengers: [{ baggages: [{ type: 'checked', quantity: 1 }, { type: 'carry_on', quantity: 1 }] }],
    }] }],
  }, { passengers: 2, cabinClass: 'ECONOMY', departureDate: '2030-11-25' });
  assert.equal(offer.provider, 'DUFFEL');
  assert.equal(offer.flightNumber, '6E-201');
  assert.equal(offer.durationMinutes, 90);
  assert.equal(offer.stops, 0);
  assert.equal(offer.price, 8400);
  assert.equal(offer.pricePerPassenger, 4200);
  assert.equal(offer.departureTime.toISOString(), '2030-11-25T03:00:00.000Z');
  assert.equal(normaliseDuffelOffer({ id: 'x', slices: [] }, { passengers: 1 }), null);
});

const flights = [
  { id: 'F1', price: 4200, durationMinutes: 90, stops: 0 },
  { id: 'F2', price: 3500, durationMinutes: 150, stops: 1 },
  { id: 'F3', price: 6500, durationMinutes: 75, stops: 0 },
];

test('local fallback picks the true cheapest and fastest, all distinct', () => {
  const result = fallbackRecommendations({ flights, preferences: {} });
  const picks = Object.fromEntries(result.recommendations.map((r) => [r.category, r.flightId]));
  assert.equal(result.engine, 'LOCAL_FALLBACK');
  assert.deepEqual(picks, { BEST_OVERALL: 'F1', CHEAPEST: 'F2', FASTEST: 'F3' });
});

test('local fallback survives equal values, filters and an empty list', () => {
  const same = [1, 2, 3].map((i) => ({ id: `S${i}`, price: 4000, durationMinutes: 90, stops: 0 }));
  assert.equal(fallbackRecommendations({ flights: same }).recommendations.length, 3);
  const nonStop = fallbackRecommendations({ flights, preferences: { nonStopOnly: true } });
  assert.ok(!nonStop.recommendations.some((r) => r.flightId === 'F2'));
  assert.equal(fallbackRecommendations({ flights: [] }).recommendations.length, 0);
});
