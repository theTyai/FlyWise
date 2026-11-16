// Small single-document collections: global settings and the booking-reference counter.
import mongoose from 'mongoose';

const { Schema } = mongoose;
const DEFAULT_SIMULATED_SEATS = 12;

const settingSchema = new Schema({
  _id: { type: String, default: 'global' },
  defaultSimulatedSeats: { type: Number, default: DEFAULT_SIMULATED_SEATS, min: 0, max: 500 },
}, { timestamps: true });

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema, 'settings');
export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema, 'counters');

// The settings document is created the first time anything asks for it.
export async function getSettings() {
  return Setting.findOneAndUpdate(
    { _id: 'global' },
    { $setOnInsert: { defaultSimulatedSeats: DEFAULT_SIMULATED_SEATS } },
    { new: true, upsert: true },
  );
}

// FWB-2026-00001 style references. $inc on one document is atomic, so two requests
// created at the same instant can never receive the same number.
export async function nextBookingReference(session = null) {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `booking-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, ...(session ? { session } : {}) },
  );
  return `FWB-${year}-${String(counter.seq).padStart(5, '0')}`;
}
