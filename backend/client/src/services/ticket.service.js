// Ticket service: generates PNRs, seat numbers, e-tickets, and boarding pass data.
import crypto from 'node:crypto';
import { BookingRequest, Ticket } from '@flywise/shared/models.js';
import { ApiError } from '@flywise/shared/http.js';
import { serializeTicket } from '../utils/serializers.js';

const SEAT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function generatePNR() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars[Math.floor(Math.random() * chars.length)];
  }
  return pnr;
}

export function generateTicketNumber() {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `FWT-${new Date().getFullYear()}-${randomSuffix}`;
}

export function assignSeats(count, cabinClass = 'ECONOMY') {
  const startRow = cabinClass === 'BUSINESS' ? 1 : cabinClass === 'PREMIUM_ECONOMY' ? 6 : 12;
  const row = startRow + Math.floor(Math.random() * 8);
  const seats = [];
  for (let i = 0; i < count; i++) {
    const letter = SEAT_LETTERS[i % SEAT_LETTERS.length];
    const currentRow = row + Math.floor(i / SEAT_LETTERS.length);
    seats.push(`${currentRow}${letter}`);
  }
  return seats;
}

export async function createTicketForBooking(booking, paymentRef = null, session = null) {
  const existing = await Ticket.findOne({ bookingId: booking._id }, null, session ? { session } : {});
  if (existing) return existing;

  const pnr = generatePNR();
  const ticketNumber = generateTicketNumber();
  const assigned = assignSeats(booking.passengers.length, booking.flight.cabinClass);

  const passengers = booking.passengers.map((p, idx) => ({
    name: `${p.firstName} ${p.lastName}`,
    gender: p.gender,
    dateOfBirth: p.dateOfBirth,
    seatNumber: assigned[idx] || `${12 + idx}A`,
    boardingGroup: booking.flight.cabinClass === 'BUSINESS' ? 'Priority' : idx < 2 ? 'Zone 1' : 'Zone 2',
  }));

  const qrData = JSON.stringify({
    pnr,
    ticketNumber,
    flight: booking.flight.flightNumber,
    from: booking.flight.origin,
    to: booking.flight.destination,
    date: booking.flight.departureTime,
    passengers: passengers.map((p) => ({ name: p.name, seat: p.seatNumber })),
  });

  const [ticket] = await Ticket.create(
    [
      {
        bookingId: booking._id,
        ticketNumber,
        pnr,
        flight: {
          airline: booking.flight.airline,
          airlineCode: booking.flight.airlineCode || booking.flight.airline.slice(0, 2).toUpperCase(),
          flightNumber: booking.flight.flightNumber,
          origin: booking.flight.origin,
          destination: booking.flight.destination,
          departureTime: booking.flight.departureTime,
          arrivalTime: booking.flight.arrivalTime,
          terminal: 'T2',
          gate: `G${Math.floor(10 + Math.random() * 25)}`,
          cabinClass: booking.flight.cabinClass,
        },
        passengers,
        totalFare: {
          amount: booking.pricing.amount,
          currency: booking.pricing.currency,
        },
        paymentReference: paymentRef || `PAY-MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        qrData,
        status: 'CONFIRMED',
        issuedAt: new Date(),
      },
    ],
    session ? { session } : {},
  );

  return ticket;
}

export async function getTicketForBooking(bookingId, userId) {
  const booking = await BookingRequest.findOne({ _id: bookingId, userId });
  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found in your account.');
  }

  let ticket = await Ticket.findOne({ bookingId: booking._id });
  if (!ticket && booking.status === 'CONFIRMED') {
    // Generate if missing
    ticket = await createTicketForBooking(booking);
  }

  if (!ticket) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket is not yet issued for this trip.');
  }

  return serializeTicket(ticket);
}
