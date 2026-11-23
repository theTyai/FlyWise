// Serializers turn database documents into the JSON the desk API returns. Fields are
// listed one by one so nothing internal (password hashes, token ids) can leak by accident.

export const publicAdmin = (a) => ({
  id: String(a._id), name: a.name, email: a.email, role: a.role, permissions: a.permissions,
});

// One row of the requests table. Expects userId to be populated with name/email/phone.
export const bookingSummary = (b) => {
  const leadPassenger = b.passengers?.[0];
  const passengerName = leadPassenger ? `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim() : 'Guest';
  const traveller = b.userId && b.userId.name
    ? { id: String(b.userId._id), name: b.userId.name, email: b.userId.email, phone: b.userId.phone || '' }
    : { id: b.userId ? String(b.userId._id || b.userId) : null, name: passengerName, email: b.contact?.email || '', phone: b.contact?.phone || '' };

  return {
    id: String(b._id),
    bookingReference: b.bookingReference,
    status: b.status,
    traveller,
    passengers: (b.passengers || []).map((p) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
    })),
    contact: b.contact || null,
    airline: b.flight.airline,
    flightNumber: b.flight.flightNumber,
    origin: b.flight.origin,
    destination: b.flight.destination,
    departureTime: b.flight.departureTime,
    passengerCount: b.passengers.length,
    amount: b.pricing.amount,
    currency: b.pricing.currency,
    createdAt: b.createdAt,
  };
};

// Everything the request-detail screen shows about one booking.
export const bookingDetail = (b) => ({
  ...bookingSummary(b),
  inventoryMode: b.inventoryMode,
  recommendationCategory: b.recommendationCategory,
  flight: {
    provider: b.flight.provider, providerOfferId: b.flight.providerOfferId, flightKey: b.flight.flightKey,
    airline: b.flight.airline, flightNumber: b.flight.flightNumber, origin: b.flight.origin, destination: b.flight.destination,
    departureTime: b.flight.departureTime, arrivalTime: b.flight.arrivalTime, durationMinutes: b.flight.durationMinutes,
    stops: b.flight.stops, cabinClass: b.flight.cabinClass,
    baggage: { cabin: b.flight.baggage?.cabin || '', checked: b.flight.baggage?.checked || '' },
    segments: (b.flight.segments || []).map((s) => ({
      flightNumber: s.flightNumber, origin: s.origin, destination: s.destination, departureTime: s.departureTime, arrivalTime: s.arrivalTime,
    })),
  },
  passengers: b.passengers.map((p) => ({ firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth, gender: p.gender })),
  contact: { email: b.contact?.email || '', phone: b.contact?.phone || '' },
  pricing: { amount: b.pricing.amount, currency: b.pricing.currency, perPassenger: b.pricing.perPassenger, passengerCount: b.pricing.passengerCount },
  adminDecision: b.adminDecision?.action
    ? { action: b.adminDecision.action, reason: b.adminDecision.reason, adminName: b.adminDecision.adminName, decidedAt: b.adminDecision.decidedAt }
    : null,
  cancellation: b.cancellation?.at ? { reason: b.cancellation.reason || '', at: b.cancellation.at } : null,
  history: (b.history || []).map((h) => ({ status: h.status, at: h.at, actor: h.actor, note: h.note || '' })),
  updatedAt: b.updatedAt,
});

export const serializeInventory = (i) => ({
  id: String(i._id), flightKey: i.flightKey, flightNumber: i.flightNumber, airline: i.airline || '',
  origin: i.origin, destination: i.destination, departureTime: i.departureTime,
  totalSeats: i.totalSeats, availableSeats: i.availableSeats, allocatedSeats: i.totalSeats - i.availableSeats,
  inventoryMode: i.inventoryMode, updatedAt: i.updatedAt,
});

export const serializeAuditLog = (l) => ({
  id: String(l._id), action: l.action, actorName: l.actorName || '',
  bookingId: l.bookingId ? String(l.bookingId) : null, bookingReference: l.bookingReference || '',
  previousStatus: l.previousStatus || '', newStatus: l.newStatus || '',
  reason: l.reason || '', meta: l.meta || null, timestamp: l.timestamp,
});

export const serializeTraveller = (u, bookings = 0) => ({
  id: String(u._id), name: u.name, email: u.email, phone: u.phone || '',
  accountStatus: u.accountStatus, bookings, createdAt: u.createdAt,
});

export const serializeSettings = (s) => ({ defaultSimulatedSeats: s.defaultSimulatedSeats, updatedAt: s.updatedAt });
