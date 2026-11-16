import { z } from 'zod';
import { PHONE_PATTERN, email, password } from './common.js';

// .strict() rejects unknown keys, so nobody can send "role": "ADMIN" at sign-up.
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email,
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a phone number with 7 to 15 digits').optional().or(z.literal('')),
  password,
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(72),
}).strict();

export const refreshSchema = z.object({ refreshToken: z.string().min(20) }).strict();
