import { z } from 'zod';
import { PHONE_PATTERN } from './common.js';

// Only these two fields can be changed. Email, role and account status are not editable here.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80).optional(),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a phone number with 7 to 15 digits').or(z.literal('')).optional(),
}).strict();
