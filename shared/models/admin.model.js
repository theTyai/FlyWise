// Desk (admin) accounts. Kept in a separate collection from travellers and signed with a
// different JWT secret, so a traveller account can never be promoted by editing a field.
import mongoose from 'mongoose';
import { ADMIN_PERMISSIONS } from '../constants.js';

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['ADMIN'], default: 'ADMIN' },
  permissions: [{ type: String, enum: ADMIN_PERMISSIONS }],
  accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
}, { timestamps: true });

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema, 'admins');
