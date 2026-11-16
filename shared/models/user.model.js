// Travellers. Created by the user backend at sign-up; the admin backend can only suspend/reactivate.
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 20 },
  passwordHash: { type: String, required: true, select: false }, // bcrypt hash; never returned by default
  role: { type: String, enum: ['USER'], default: 'USER' },
  accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  refreshTokenId: { type: String, select: false, default: null }, // id of the only refresh token still accepted
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
