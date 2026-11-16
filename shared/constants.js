// Single source of truth for values every service and both frontends agree on.
// This file has no dependencies so it is safe to import in the browser.

export const BOOKING_STATUS = Object.freeze({
  SEARCHED: 'SEARCHED',
  SELECTED: 'SELECTED',
  PENDING_ADMIN_APPROVAL: 'PENDING_ADMIN_APPROVAL',
  PRICE_REVALIDATION: 'PRICE_REVALIDATION',
  ALLOCATION_IN_PROGRESS: 'ALLOCATION_IN_PROGRESS',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REVOKED: 'REVOKED',
  BOOKING_FAILED: 'BOOKING_FAILED',
});

const S = BOOKING_STATUS;

// The booking state machine. A status may only move along these edges.
// SEARCHED and SELECTED happen in the browser before a request is saved.
// PRICE_REVALIDATION is reserved for live-provider booking (Mode B).
export const TRANSITIONS = Object.freeze({
  [S.SEARCHED]: [S.SELECTED],
  [S.SELECTED]: [S.PENDING_ADMIN_APPROVAL, S.ALLOCATION_IN_PROGRESS],
  [S.PENDING_ADMIN_APPROVAL]: [S.PRICE_REVALIDATION, S.ALLOCATION_IN_PROGRESS, S.REJECTED, S.CANCELLED],
  [S.PRICE_REVALIDATION]: [S.ALLOCATION_IN_PROGRESS, S.BOOKING_FAILED, S.PENDING_ADMIN_APPROVAL],
  [S.ALLOCATION_IN_PROGRESS]: [S.CONFIRMED, S.PENDING_ADMIN_APPROVAL, S.BOOKING_FAILED],
  [S.CONFIRMED]: [S.REVOKED, S.CANCELLED],
  [S.REJECTED]: [],
  [S.CANCELLED]: [],
  [S.REVOKED]: [],
  [S.BOOKING_FAILED]: [],
});

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export const TERMINAL_STATUSES = Object.freeze(
  Object.keys(TRANSITIONS).filter((s) => TRANSITIONS[s].length === 0),
);

// Statuses that are stored on a booking request (the first two never are).
export const STORED_STATUSES = Object.freeze([
  S.PENDING_ADMIN_APPROVAL, S.PRICE_REVALIDATION, S.ALLOCATION_IN_PROGRESS,
  S.CONFIRMED, S.REJECTED, S.CANCELLED, S.REVOKED, S.BOOKING_FAILED,
]);

// Plain-language labels. "tone" maps to a colour in the design system.
export const STATUS_META = Object.freeze({
  [S.PENDING_ADMIN_APPROVAL]: { label: 'Waiting for review', tone: 'pending' },
  [S.PRICE_REVALIDATION]: { label: 'Checking the fare', tone: 'progress' },
  [S.ALLOCATION_IN_PROGRESS]: { label: 'Allocating seats', tone: 'progress' },
  [S.CONFIRMED]: { label: 'Confirmed', tone: 'confirmed' },
  [S.REJECTED]: { label: 'Rejected', tone: 'rejected' },
  [S.CANCELLED]: { label: 'Cancelled', tone: 'cancelled' },
  [S.REVOKED]: { label: 'Revoked', tone: 'revoked' },
  [S.BOOKING_FAILED]: { label: 'Failed', tone: 'rejected' },
});

export const CATEGORY = Object.freeze({
  BEST_OVERALL: 'BEST_OVERALL',
  CHEAPEST: 'CHEAPEST',
  FASTEST: 'FASTEST',
});

export const CATEGORY_META = Object.freeze({
  BEST_OVERALL: { label: 'Best overall', tone: 'best' },
  CHEAPEST: { label: 'Cheapest', tone: 'cheapest' },
  FASTEST: { label: 'Fastest', tone: 'fastest' },
});

export const NOTIFICATION_TYPE = Object.freeze({
  BOOKING_REQUEST_CREATED: 'BOOKING_REQUEST_CREATED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_REJECTED: 'BOOKING_REJECTED',
  BOOKING_REVOKED: 'BOOKING_REVOKED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  PRICE_CHANGED: 'PRICE_CHANGED',
  BOOKING_FAILED: 'BOOKING_FAILED',
});

export const ADMIN_PERMISSIONS = Object.freeze([
  'VIEW_REQUESTS', 'APPROVE_BOOKINGS', 'REJECT_BOOKINGS', 'REVOKE_BOOKINGS',
  'MANAGE_INVENTORY', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'MANAGE_SETTINGS',
]);

export const CABIN_CLASSES = Object.freeze(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS']);
export const CABIN_LABEL = Object.freeze({
  ECONOMY: 'Economy', PREMIUM_ECONOMY: 'Premium economy', BUSINESS: 'Business',
});
export const PRIORITIES = Object.freeze(['BALANCED', 'CHEAPEST', 'FASTEST']);
export const DEPARTURE_WINDOWS = Object.freeze(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']);

// Airports the search form accepts. Coordinates are used only by the sample-data
// provider to estimate distance; they are approximate.
export const AIRPORTS = Object.freeze([
  { code: 'DEL', city: 'Delhi', name: 'Indira Gandhi International', lat: 28.556, lon: 77.1 },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International', lat: 19.089, lon: 72.868 },
  { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International', lat: 13.199, lon: 77.706 },
  { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International', lat: 17.24, lon: 78.429 },
  { code: 'MAA', city: 'Chennai', name: 'Chennai International', lat: 12.994, lon: 80.171 },
  { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International', lat: 22.654, lon: 88.447 },
  { code: 'BHO', city: 'Bhopal', name: 'Raja Bhoj Airport', lat: 23.287, lon: 77.337 },
  { code: 'IDR', city: 'Indore', name: 'Devi Ahilya Bai Holkar Airport', lat: 22.722, lon: 75.801 },
  { code: 'PNQ', city: 'Pune', name: 'Pune Airport', lat: 18.582, lon: 73.92 },
  { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel International', lat: 23.077, lon: 72.635 },
  { code: 'GOI', city: 'Goa', name: 'Dabolim Airport', lat: 15.381, lon: 73.831 },
  { code: 'JAI', city: 'Jaipur', name: 'Jaipur International', lat: 26.824, lon: 75.812 },
  { code: 'LKO', city: 'Lucknow', name: 'Chaudhary Charan Singh International', lat: 26.761, lon: 80.889 },
  { code: 'COK', city: 'Kochi', name: 'Cochin International', lat: 10.152, lon: 76.402 },
  { code: 'GAU', city: 'Guwahati', name: 'Lokpriya Gopinath Bordoloi International', lat: 26.106, lon: 91.586 },
  { code: 'PAT', city: 'Patna', name: 'Jay Prakash Narayan Airport', lat: 25.591, lon: 85.088 },
  { code: 'NAG', city: 'Nagpur', name: 'Dr. Babasaheb Ambedkar International', lat: 21.092, lon: 79.047 },
  { code: 'IXC', city: 'Chandigarh', name: 'Chandigarh Airport', lat: 30.673, lon: 76.789 },
  { code: 'SXR', city: 'Srinagar', name: 'Srinagar Airport', lat: 33.987, lon: 74.774 },
  { code: 'VNS', city: 'Varanasi', name: 'Lal Bahadur Shastri Airport', lat: 25.452, lon: 82.859 },
  { code: 'TRV', city: 'Thiruvananthapuram', name: 'Trivandrum International', lat: 8.482, lon: 76.92 },
  { code: 'BBI', city: 'Bhubaneswar', name: 'Biju Patnaik Airport', lat: 20.244, lon: 85.818 },
  { code: 'RPR', city: 'Raipur', name: 'Swami Vivekananda Airport', lat: 21.18, lon: 81.739 },
  { code: 'JLR', city: 'Jabalpur', name: 'Jabalpur Airport', lat: 23.178, lon: 80.052 },
]);

export const AIRPORT_CODES = Object.freeze(AIRPORTS.map((a) => a.code));
export const AIRPORT_BY_CODE = Object.freeze(Object.fromEntries(AIRPORTS.map((a) => [a.code, a])));

export const MAX_PASSENGERS = 6;
