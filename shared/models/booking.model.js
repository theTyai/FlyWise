// Booking requests: the central record of the project. A traveller creates one, the desk
// decides it, and its "history" array records every status it has been through.
import mongoose from 'mongoose';
import { BOOKING_STATUS, STORED_STATUSES } from '../constants.js';
import { flightFields } from './flight.model.js';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const passengerSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: String, required: true }, // YYYY-MM-DD
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
}, { _id: false });

const historySchema = new Schema({
  status: String,
  at: { type: Date, default: Date.now },
  actor: { type: String, enum: ['USER', 'ADMIN', 'SYSTEM'] },
  note: String,
}, { _id: false });

const bookingRequestSchema = new Schema({
  bookingReference: { type: String, required: true, unique: true }, // FWB-2026-00001
  userId: { type: ObjectId, ref: 'User', required: true },
  searchId: { type: ObjectId, ref: 'Search' },
  offerId: { type: ObjectId, ref: 'FlightOffer' },
  recommendationCategory: { type: String, default: null },
  flight: new Schema(flightFields, { _id: false }), // snapshot copied from the server's stored offer
  passengers: { type: [passengerSchema], validate: (v) => v.length >= 1 },
  contact: { email: String, phone: String },
  pricing: { amount: Number, currency: String, perPassenger: Number, passengerCount: Number },
  status: { type: String, enum: STORED_STATUSES, default: BOOKING_STATUS.PENDING_ADMIN_APPROVAL },
  inventoryMode: { type: String, enum: ['SIMULATED'], default: 'SIMULATED' },
  adminDecision: {
    adminId: { type: ObjectId, ref: 'Admin', default: null },
    adminName: { type: String, default: null },
    action: { type: String, default: null }, // CONFIRM | REJECT | REVOKE
    reason: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    idempotencyKey: { type: String, default: null },
  },
  cancellation: { reason: String, at: Date },
  history: [historySchema],
}, { timestamps: true });

bookingRequestSchema.index({ userId: 1, createdAt: -1 }); // "My trips"
bookingRequestSchema.index({ status: 1, createdAt: -1 }); // the desk queue
bookingRequestSchema.index({ 'flight.flightKey': 1 }); // duplicate-request check

export const BookingRequest = mongoose.models.BookingRequest
  || mongoose.model('BookingRequest', bookingRequestSchema, 'bookingRequests');
