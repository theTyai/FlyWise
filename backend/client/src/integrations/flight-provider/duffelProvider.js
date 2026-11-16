// Live flight offers from the Duffel API (https://duffel.com/docs/api).
// Enabled with FLIGHT_PROVIDER=duffel and DUFFEL_ACCESS_TOKEN in .env.
//
// Only offer SEARCH is implemented. Creating real airline orders (Mode B in the
// project blueprint) is deliberately out of scope: FlyWise approvals are simulated.
//
// NOTE: this adapter was written against Duffel's documented v2 API but could not
// be exercised without an access token. Test it with a Duffel test-mode token first.
import { ApiError } from '@flywise/shared/http.js';

const BASE_URL = 'https://api.duffel.com';
const CABIN = { ECONOMY: 'economy', PREMIUM_ECONOMY: 'premium_economy', BUSINESS: 'business' };
const MAX_OFFERS = 40;

// "PT2H35M" -> 155
export function isoDurationToMinutes(iso) {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || '');
  if (!match) return 0;
  return (Number(match[1] || 0) * 24 + Number(match[2] || 0)) * 60 + Number(match[3] || 0);
}

// Duffel returns local times without an offset. FlyWise covers Indian domestic
// routes, so they are read as IST.
const toDate = (local) => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(local) ? local : `${local}+05:30`);

function baggageText(segment, type) {
  const bags = segment?.passengers?.[0]?.baggages || [];
  const bag = bags.find((b) => b.type === type);
  if (!bag || !bag.quantity) return type === 'checked' ? 'Not included' : 'See airline';
  return `${bag.quantity} bag${bag.quantity > 1 ? 's' : ''}`;
}

// Convert one Duffel offer into FlyWise's normalised flight shape. Exported for tests.
export function normaliseDuffelOffer(offer, { passengers, cabinClass, departureDate }) {
  const slice = offer?.slices?.[0];
  const segments = slice?.segments || [];
  if (!segments.length || !offer.total_amount) return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const number = (s) => `${s.marketing_carrier?.iata_code || ''}-${s.marketing_carrier_flight_number || ''}`;
  const total = Number(offer.total_amount);
  const departureTime = toDate(first.departing_at);
  const arrivalTime = toDate(last.arriving_at);
  const durationMinutes = isoDurationToMinutes(slice.duration) || Math.round((arrivalTime - departureTime) / 60000);
  if (!Number.isFinite(total) || total <= 0 || !(durationMinutes > 0)) return null;
  const flightNumber = segments.map(number).join('/');
  return {
    provider: 'DUFFEL',
    providerOfferId: offer.id,
    flightKey: `${flightNumber}_${departureDate}`,
    airline: first.marketing_carrier?.name || offer.owner?.name || 'Unknown airline',
    airlineCode: first.marketing_carrier?.iata_code || '',
    flightNumber,
    origin: first.origin?.iata_code,
    destination: last.destination?.iata_code,
    departureTime, arrivalTime, durationMinutes,
    stops: segments.length - 1,
    segments: segments.map((s) => ({
      airline: s.marketing_carrier?.name, flightNumber: number(s),
      origin: s.origin?.iata_code, destination: s.destination?.iata_code,
      departureTime: toDate(s.departing_at), arrivalTime: toDate(s.arriving_at),
    })),
    cabinClass,
    baggage: { cabin: baggageText(first, 'carry_on'), checked: baggageText(first, 'checked') },
    currency: offer.total_currency,
    passengerCount: passengers,
    price: total,
    pricePerPassenger: Math.round((total / passengers) * 100) / 100,
    expiresAt: new Date(offer.expires_at),
  };
}

export function createDuffelProvider(token) {
  if (!token) {
    throw new Error('FLIGHT_PROVIDER=duffel needs DUFFEL_ACCESS_TOKEN. Set it, or use FLIGHT_PROVIDER=mock for sample data.');
  }
  return {
    name: 'DUFFEL',
    mode: 'LIVE',
    label: 'Live offers from Duffel',
    async search({ origin, destination, departureDate, passengers, cabinClass }) {
      let response;
      try {
        response = await fetch(`${BASE_URL}/air/offer_requests?return_offers=true`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'duffel-version': 'v2',
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            data: {
              slices: [{ origin, destination, departure_date: departureDate }],
              passengers: Array.from({ length: passengers }, () => ({ type: 'adult' })),
              cabin_class: CABIN[cabinClass] || 'economy',
            },
          }),
          signal: AbortSignal.timeout(25000),
        });
      } catch (err) {
        // No silent switch to sample data: a live-provider failure is reported as one.
        throw new ApiError(502, 'FLIGHT_PROVIDER_UNAVAILABLE', 'The flight data provider is not responding. Try again in a minute.');
      }
      if (!response.ok) {
        console.error(`[duffel] HTTP ${response.status}`);
        throw new ApiError(502, 'FLIGHT_PROVIDER_ERROR', 'The flight data provider could not complete this search. Try again in a minute.');
      }
      const body = await response.json();
      return (body?.data?.offers || [])
        .map((offer) => normaliseDuffelOffer(offer, { passengers, cabinClass, departureDate }))
        .filter((o) => o && o.origin === origin && o.destination === destination && o.expiresAt > new Date())
        .sort((a, b) => a.price - b.price)
        .slice(0, MAX_OFFERS);
    },
  };
}
