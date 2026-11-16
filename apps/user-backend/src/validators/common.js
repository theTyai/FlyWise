// Field rules reused by more than one schema.
import { z } from 'zod';

export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(120);
export const password = z.string().min(8, 'Use at least 8 characters').max(72); // bcrypt reads at most 72 bytes
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
