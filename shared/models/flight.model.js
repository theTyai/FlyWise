// Searches and the flight offers each search returned.
import mongoose from 'mongoose';
import { CABIN_CLASSES } from '../constants.js';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const segmentSchema = new Schema({
  airline: String,
  flightNumber: String,
  origin: String,
  destination: String,
  departureTime: Date,
  arrivalTime: Date,
}, { _id: false });

// The normalised flight - the one internal shape every flight provider is converted to.
// Exported because a booking request stores a snapshot with exactly these fields.
export const flightFields = {
  provider: { type: String, enum: ['REAL_SCHEDULE', 'LIVE', 'MOCK', 'DUFFEL'], required: true },
  providerOfferId: { type: String, required: true },
  flightKey: { type: String, required: true }, // flight number(s) + date; identifies one simulated inventory record
  airline: { type: String, required: true },
  airlineCode: String,
  flightNumber: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  stops: { type: Number, required: true, min: 0 },
  segments: [segmentSchema],
  cabinClass: { type: String, enum: CABIN_CLASSES, default: 'ECONOMY' },
  baggage: { cabin: String, checked: String },
  currency: { type: String, default: 'INR' },
  pricePerPassenger: { type: Number, required: true, min: 0 },
  passengerCount: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }, // total for all passengers
  availableSeats: { type: Number, default: 12, min: 0 },
  totalSeats: { type: Number, default: 12, min: 0 },
};

const flightOfferSchema = new Schema({
  searchId: { type: ObjectId, ref: 'Search', required: true, index: true },
  ...flightFields,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

flightOfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const recommendationSchema = new Schema({
  offerId: { type: ObjectId, ref: 'FlightOffer' },
  category: { type: String, enum: ['BEST_OVERALL', 'CHEAPEST', 'FASTEST'] },
  reason: String,
  score: Number,
}, { _id: false });

const searchSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', default: null, index: true },
  origin: String,
  destination: String,
  departureDate: String, // YYYY-MM-DD
  passengers: Number,
  cabinClass: String,
  preferences: Schema.Types.Mixed, // what the traveller asked for
  naturalLanguage: String,
  appliedPreferences: Schema.Types.Mixed, // what the ranking engine actually used
  provider: String,
  providerMode: { type: String, enum: ['MOCK', 'LIVE'] },
  engine: { type: String, enum: ['LLM', 'DETERMINISTIC', 'LOCAL_FALLBACK', 'NONE'] },
  engineNotes: [String],
  recommendations: [recommendationSchema],
  offerCount: Number,
}, { timestamps: true });

export const Search = mongoose.models.Search || mongoose.model('Search', searchSchema, 'searches');
export const FlightOffer = mongoose.models.FlightOffer || mongoose.model('FlightOffer', flightOfferSchema, 'flightOffers');
