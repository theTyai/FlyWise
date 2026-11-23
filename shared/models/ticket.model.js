// E-Ticket records created after confirmed booking and payment
import mongoose from 'mongoose';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const passengerTicketSchema = new Schema({
  name: { type: String, required: true },
  gender: String,
  dateOfBirth: String,
  seatNumber: { type: String, required: true },
  boardingGroup: { type: String, default: 'Zone 1' },
}, { _id: false });

const ticketSchema = new Schema({
  bookingId: { type: ObjectId, ref: 'BookingRequest', required: true, unique: true },
  ticketNumber: { type: String, required: true, unique: true }, // e.g. FWT-2026-00001
  pnr: { type: String, required: true, index: true }, // 6-character alphanumeric
  flight: {
    airline: String,
    airlineCode: String,
    flightNumber: String,
    origin: String,
    destination: String,
    departureTime: Date,
    arrivalTime: Date,
    terminal: { type: String, default: 'T3' },
    gate: { type: String, default: 'G12' },
    cabinClass: String,
  },
  passengers: [passengerTicketSchema],
  totalFare: { amount: Number, currency: String },
  paymentReference: String,
  qrData: { type: String, required: true },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED', 'USED'], default: 'CONFIRMED' },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema, 'tickets');
