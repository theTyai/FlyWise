// Temporary 5-minute seat locks for real-time checkout & simulated payment
import mongoose from 'mongoose';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const seatLockSchema = new Schema({
  lockKey: { type: String, required: true, unique: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  offerId: { type: ObjectId, ref: 'FlightOffer', required: true },
  flightKey: { type: String, required: true, index: true },
  seats: { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['LOCKED', 'CONFIRMED', 'EXPIRED', 'RELEASED'], default: 'LOCKED' },
}, { timestamps: true });

export const SeatLock = mongoose.models.SeatLock || mongoose.model('SeatLock', seatLockSchema, 'seatLocks');
