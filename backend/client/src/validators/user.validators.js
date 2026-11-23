import { z } from 'zod';
import { ISO_DATE_PATTERN, PHONE_PATTERN } from './common.js';

const addressSchema = z.object({
  line1: z.string().trim().max(100).optional().default(''),
  line2: z.string().trim().max(100).optional().default(''),
  city: z.string().trim().max(50).optional().default(''),
  state: z.string().trim().max(50).optional().default(''),
  pincode: z.string().trim().max(10).optional().default(''),
}).optional();

// Travellers can manage their identity, contact, and profile details
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80).optional(),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a phone number with 7 to 15 digits').or(z.literal('')).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().regex(ISO_DATE_PATTERN, 'Enter a valid date of birth (YYYY-MM-DD)').optional().or(z.literal('')),
  nationality: z.string().trim().max(50).optional(),
  idType: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID']).optional(),
  idNumber: z.string().trim().max(30).optional(),
  address: addressSchema,
}).strict();
