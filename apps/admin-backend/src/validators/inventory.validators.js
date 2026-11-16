import { z } from 'zod';
import { AIRPORT_CODES } from '@flywise/shared/constants.js';

const MAX_SEATS = 500;
const airport = z.string().trim().toUpperCase().refine((c) => AIRPORT_CODES.includes(c), 'Use a supported airport code');
const seatTotal = z.coerce.number().int().min(0).max(MAX_SEATS);

export const createInventorySchema = z.object({
  flightNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}-\d{1,4}(\/\d{1,4})?$/, 'Use a flight number like 6E-201'),
  airline: z.string().trim().max(40).optional(),
  origin: airport,
  destination: airport,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the flight date'),
  totalSeats: seatTotal,
}).strict().refine((v) => v.origin !== v.destination, { message: 'Origin and destination must be different', path: ['destination'] });

export const updateInventorySchema = z.object({ totalSeats: seatTotal }).strict();
