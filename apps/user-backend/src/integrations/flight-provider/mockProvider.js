// SAMPLE-DATA flight provider for local development and demos.
//
// Everything this file returns is generated, not real: airline names are familiar
// so the UI looks realistic, but the flight numbers, schedules and fares are made up.
// Every offer is tagged provider: 'MOCK' and the UI labels it "Sample fares".
//
// The generator is deterministic: the same route and date always produce the same
// flights, so two travellers searching BHO -> DEL on one date compete for the same
// simulated seats - which is what makes the "last seat" demo possible.
import { AIRPORT_BY_CODE } from '@flywise/shared/constants.js';

const AIRLINES = [
  { code: '6E', name: 'IndiGo', factor: 1.0, minutes: 0 },
  { code: 'AI', name: 'Air India', factor: 1.12, minutes: 4 },
  { code: 'QP', name: 'Akasa Air', factor: 0.97, minutes: 2 },
  { code: 'SG', name: 'SpiceJet', factor: 0.93, minutes: 6 },
  { code: 'IX', name: 'Air India Express', factor: 0.9, minutes: 5 },
];
const HUBS = ['DEL', 'BOM', 'BLR', 'HYD'];
const CABIN = {
  ECONOMY: { factor: 1, cabin: '7 kg', checked: '15 kg' },
  PREMIUM_ECONOMY: { factor: 1.6, cabin: '7 kg', checked: '25 kg' },
  BUSINESS: { factor: 3.2, cabin: '10 kg', checked: '35 kg' },
};
const OFFER_TTL_MS = 30 * 60 * 1000;
const IST = '+05:30';

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const flightMinutes = (km) => Math.round(km / 13 + 38); // ~780 km/h plus taxi, climb and descent
const baseFare = (km) => 1450 + km * 3.4;
const pad = (n) => String(n).padStart(2, '0');
const localTime = (date, minutesFromMidnight) =>
  new Date(`${date}T${pad(Math.floor(minutesFromMidnight / 60))}:${pad(minutesFromMidnight % 60)}:00${IST}`);

function timeOfDayFactor(minutesFromMidnight) {
  const hour = Math.floor(minutesFromMidnight / 60);
  if (hour >= 6 && hour < 10) return 1.18;
  if (hour >= 17 && hour < 21) return 1.22;
  if (hour >= 10 && hour < 17) return 0.96;
  return 0.84;
}

function leadTimeFactor(departureDate, now) {
  const days = (new Date(`${departureDate}T00:00:00${IST}`).getTime() - now.getTime()) / 86400000;
  if (days < 3) return 1.45;
  if (days < 7) return 1.3;
  if (days < 14) return 1.15;
  if (days < 30) return 1.05;
  return 1;
}

const roundFare = (value) => Math.max(999, Math.round(value / 50) * 50 - 1);

export function generateMockOffers({ origin, destination, departureDate, passengers = 1, cabinClass = 'ECONOMY' }, now = new Date()) {
  const from = AIRPORT_BY_CODE[origin];
  const to = AIRPORT_BY_CODE[destination];
  if (!from || !to || origin === destination) return [];

  const seed = hashString(`${origin}-${destination}-${departureDate}`);
  const rand = mulberry32(seed);
  const cabin = CABIN[cabinClass] || CABIN.ECONOMY;
  const lead = leadTimeFactor(departureDate, now);
  const km = distanceKm(from, to);
  const usedNumbers = new Set();
  const expiresAt = new Date(now.getTime() + OFFER_TTL_MS);
  const offers = [];

  const flightNumber = (airline) => {
    let number;
    do { number = `${airline.code}-${200 + Math.floor(rand() * 6800)}`; } while (usedNumbers.has(number));
    usedNumbers.add(number);
    return number;
  };
  const build = (fields) => {
    const pricePerPassenger = fields.pricePerPassenger;
    offers.push({
      provider: 'MOCK',
      providerOfferId: `mock_${seed.toString(16)}_${offers.length + 1}`,
      origin, destination, cabinClass,
      currency: 'INR',
      baggage: { cabin: cabin.cabin, checked: cabin.checked },
      passengerCount: passengers,
      price: pricePerPassenger * passengers,
      expiresAt,
      ...fields,
      flightKey: `${fields.flightNumber}_${departureDate}`,
    });
  };

  // Non-stop flights spread across the day.
  const directCount = 8 + Math.floor(rand() * 4);
  const firstDeparture = 5 * 60 + 30;
  const span = 17 * 60;
  for (let i = 0; i < directCount; i += 1) {
    const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)];
    const slot = firstDeparture + (span / directCount) * i + rand() * (span / directCount) * 0.8;
    const departs = Math.round(slot / 5) * 5;
    const durationMinutes = flightMinutes(km) + airline.minutes + Math.floor(rand() * 6);
    const departureTime = localTime(departureDate, departs);
    const arrivalTime = new Date(departureTime.getTime() + durationMinutes * 60000);
    const number = flightNumber(airline);
    const fare = baseFare(km) * timeOfDayFactor(departs) * airline.factor * (0.9 + rand() * 0.22) * lead * cabin.factor;
    build({
      airline: airline.name, airlineCode: airline.code, flightNumber: number,
      departureTime, arrivalTime, durationMinutes, stops: 0,
      segments: [{ airline: airline.name, flightNumber: number, origin, destination, departureTime, arrivalTime }],
      pricePerPassenger: roundFare(fare),
    });
  }

  // One-stop itineraries through a hub: slower, usually cheaper.
  const hubs = HUBS.filter((h) => h !== origin && h !== destination)
    .sort((a, b) => distanceKm(from, AIRPORT_BY_CODE[a]) + distanceKm(AIRPORT_BY_CODE[a], to)
      - distanceKm(from, AIRPORT_BY_CODE[b]) - distanceKm(AIRPORT_BY_CODE[b], to));
  for (let i = 0; i < Math.min(3, hubs.length); i += 1) {
    const hub = AIRPORT_BY_CODE[hubs[i]];
    const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)];
    const departs = Math.round((6 * 60 + rand() * 12 * 60) / 5) * 5;
    const leg1 = flightMinutes(distanceKm(from, hub)) + airline.minutes;
    const layover = 55 + Math.floor(rand() * 24) * 5;
    const leg2 = flightMinutes(distanceKm(hub, to)) + airline.minutes;
    const departureTime = localTime(departureDate, departs);
    const hubArrival = new Date(departureTime.getTime() + leg1 * 60000);
    const hubDeparture = new Date(hubArrival.getTime() + layover * 60000);
    const arrivalTime = new Date(hubDeparture.getTime() + leg2 * 60000);
    const first = flightNumber(airline);
    const second = flightNumber(airline);
    const fare = baseFare(km) * (0.7 + rand() * 0.18) * airline.factor * lead * cabin.factor;
    build({
      airline: airline.name, airlineCode: airline.code, flightNumber: `${first}/${second.split('-')[1]}`,
      departureTime, arrivalTime, durationMinutes: leg1 + layover + leg2, stops: 1,
      segments: [
        { airline: airline.name, flightNumber: first, origin, destination: hub.code, departureTime, arrivalTime: hubArrival },
        { airline: airline.name, flightNumber: second, origin: hub.code, destination, departureTime: hubDeparture, arrivalTime },
      ],
      pricePerPassenger: roundFare(fare),
    });
  }

  return offers.sort((a, b) => a.departureTime - b.departureTime);
}

export const mockProvider = {
  name: 'MOCK',
  mode: 'MOCK',
  label: 'Sample data (generated, not live fares)',
  async search(params) {
    return generateMockOffers(params);
  },
};
