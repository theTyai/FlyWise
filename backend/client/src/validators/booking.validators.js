import { z } from 'zod';
import { MAX_PASSENGERS, STORED_STATUSES } from '@flywise/shared/constants.js';
import { isValidId } from '@flywise/shared/db.js';
import { ISO_DATE_PATTERN, PHONE_PATTERN } from './common.js';

const name = (label) => z.string().trim().min(1, `Enter the ${label}`).max(40)
  .regex(/^[\p{L} .'-]+$/u, `The ${label} can only contain letters, spaces, dots, apostrophes and hyphens`);

export const passengerSchema = z.object({
  firstName: name('first name'),
  lastName: name('last name'),
  dateOfBirth: z.string().regex(ISO_DATE_PATTERN, 'Enter the date of birth').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date < new Date() && date.getUTCFullYear() > 1900;
  }, 'Enter a valid date of birth'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Choose a gender' }) }),
}).strict();

export const contactSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid contact email'),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a contact phone number with 7 to 15 digits'),
}).strict();

// Note what is NOT accepted: price, airline, times, status. The server copies those
// from its own stored offer, so a traveller cannot change a fare by editing the request.
export const createBookingSchema = z.object({
  offerId: z.string().refine(isValidId, 'Choose a flight first'),
  passengers: z.array(passengerSchema).min(1).max(MAX_PASSENGERS),
  contact: contactSchema,
  // The traveller acknowledges booking terms and automated seat allocation.
  acknowledgeSimulated: z.boolean().refine((val) => val === true, {
    message: 'Confirm that you accept the booking and seat terms',
  }).optional().default(true),
}).strict();

export const updateBookingSchema = z.object({
  passengers: z.array(passengerSchema).min(1).max(MAX_PASSENGERS).optional(),
  contact: contactSchema.optional(),
}).strict().refine((v) => v.passengers || v.contact, 'Nothing to update');

export const cancelBookingSchema = z.object({ reason: z.string().trim().max(300).optional() }).strict();

export const listBookingsSchema = z.object({ status: z.enum(STORED_STATUSES).optional() });

export const lockSeatSchema = z.object({
  offerId: z.string().refine(isValidId, 'Choose a flight offer first'),
  seats: z.number().int().min(1).max(MAX_PASSENGERS).optional().default(1),
}).strict();

export const confirmPaymentSchema = z.object({
  lockKey: z.string().optional(),
  offerId: z.string().refine(isValidId, 'Choose a flight first'),
  passengers: z.array(passengerSchema).min(1).max(MAX_PASSENGERS),
  contact: contactSchema,
  paymentMethod: z.string().max(40).optional().default('DEMO_PASS'),
  acknowledgeTerms: z.boolean().optional().default(true),
}).strict();
