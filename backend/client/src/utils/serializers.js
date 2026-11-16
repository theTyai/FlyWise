// Serializers turn database documents into the JSON the API returns. Listing fields
// one by one (instead of sending the document) means internal fields such as password
// hashes, admin ids and idempotency keys can never leak by accident.

export const publicUser = (u) => ({
  id: String(u._id), name: u.name, email: u.email, phone: u.phone || '', role: u.role,
  accountStatus: u.accountStatus, createdAt: u.createdAt,
});

export const serializeNotification = (n) => ({
  id: String(n._id), type: n.type, title: n.title, message: n.message, read: n.read,
  bookingId: n.bookingId ? String(n.bookingId) : null, bookingReference: n.bookingReference || null,
  createdAt: n.createdAt,
});

const plainFlight = (f) => ({
  provider: f.provider,
  airline: f.airline,
  airlineCode: f.airlineCode,
  flightNumber: f.flightNumber,
  flightKey: f.flightKey,
  origin: f.origin,
  destination: f.destination,
  departureTime: f.departureTime,
  arrivalTime: f.arrivalTime,
  durationMinutes: f.durationMinutes,
  stops: f.stops,
  segments: (f.segments || []).map((s) => ({
    airline: s.airline, flightNumber: s.flightNumber, origin: s.origin, destination: s.destination,
    departureTime: s.departureTime, arrivalTime: s.arrivalTime,
  })),
  cabinClass: f.cabinClass,
  baggage: { cabin: f.baggage?.cabin || '', checked: f.baggage?.checked || '' },
  currency: f.currency,
  pricePerPassenger: f.pricePerPassenger,
  passengerCount: f.passengerCount,
  price: f.price,
});

export const serializeOffer = (o, score) => ({
  id: String(o._id),
  searchId: String(o.searchId),
  ...plainFlight(o),
  expiresAt: o.expiresAt,
  expired: new Date(o.expiresAt).getTime() <= Date.now(),
  ...(score === undefined ? {} : { score }),
});

export const serializeSearch = (s) => ({
  id: String(s._id),
  origin: s.origin,
  destination: s.destination,
  departureDate: s.departureDate,
  passengers: s.passengers,
  cabinClass: s.cabinClass,
  preferences: s.preferences || {},
  naturalLanguage: s.naturalLanguage || '',
  appliedPreferences: s.appliedPreferences || {},
  provider: s.provider,
  providerMode: s.providerMode,
  engine: s.engine,
  engineNotes: s.engineNotes || [],
  offerCount: s.offerCount || 0,
  createdAt: s.createdAt,
});

export const serializeRecommendation = (r) => ({
  offerId: String(r.offerId), category: r.category, reason: r.reason, score: r.score,
});

export const serializeBooking = (b) => ({
  id: String(b._id),
  bookingReference: b.bookingReference,
  status: b.status,
  inventoryMode: b.inventoryMode,
  recommendationCategory: b.recommendationCategory || null,
  flight: plainFlight(b.flight),
  passengers: b.passengers.map((p) => ({
    firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth, gender: p.gender,
  })),
  contact: { email: b.contact?.email || '', phone: b.contact?.phone || '' },
  pricing: {
    amount: b.pricing?.amount, currency: b.pricing?.currency,
    perPassenger: b.pricing?.perPassenger, passengerCount: b.pricing?.passengerCount,
  },
  adminDecision: b.adminDecision?.action
    ? { action: b.adminDecision.action, reason: b.adminDecision.reason, decidedAt: b.adminDecision.decidedAt }
    : null,
  cancellation: b.cancellation?.at ? { reason: b.cancellation.reason || '', at: b.cancellation.at } : null,
  history: (b.history || []).map((h) => ({ status: h.status, at: h.at, actor: h.actor, note: h.note || '' })),
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});
