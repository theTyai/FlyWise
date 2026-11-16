// Simulated seat inventory and the allocations made against it.
// These numbers are internal to FlyWise. They are never proof of real airline availability.
import mongoose from 'mongoose';

const { Schema } = mongoose;

const seatInventorySchema = new Schema({
  flightKey: { type: String, required: true, unique: true }, // e.g. "6E-2031_2026-11-25"
  flightNumber: String,
  airline: String,
  origin: String,
  destination: String,
  departureTime: Date,
  totalSeats: { type: Number, required: true, min: 0 },
  availableSeats: { type: Number, required: true, min: 0 },
  inventoryMode: { type: String, enum: ['SIMULATED'], default: 'SIMULATED' },
}, { timestamps: true });

// One allocation per booking - the unique index makes a double allocation impossible.
const seatAllocationSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'BookingRequest', required: true, unique: true },
  flightKey: { type: String, required: true, index: true },
  seats: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['ACTIVE', 'RELEASED'], default: 'ACTIVE' },
  releasedAt: Date,
}, { timestamps: true });

export const SeatInventory = mongoose.models.SeatInventory
  || mongoose.model('SeatInventory', seatInventorySchema, 'seatInventory');
export const SeatAllocation = mongoose.models.SeatAllocation
  || mongoose.model('SeatAllocation', seatAllocationSchema, 'seatAllocations');
