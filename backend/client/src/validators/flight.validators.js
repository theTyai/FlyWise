import { z } from 'zod';
import {
  AIRPORT_CODES, CABIN_CLASSES, DEPARTURE_WINDOWS, MAX_PASSENGERS, PRIORITIES,
} from '@flywise/shared/constants.js';
import { istDay } from '@flywise/shared/time.js';
import { ISO_DATE_PATTERN } from './common.js';

const MAX_DAYS_AHEAD = 330; // airlines publish schedules roughly 11 months out
const airport = (message) => z.string().trim().toUpperCase().refine((code) => AIRPORT_CODES.includes(code), message);

export const searchSchema = z.object({
  origin: airport('Choose a departure airport from the list'),
  destination: airport('Choose an arrival airport from the list'),
  departureDate: z.string().regex(ISO_DATE_PATTERN, 'Choose a travel date'),
  passengers: z.coerce.number().int().min(1).max(MAX_PASSENGERS).default(1),
  cabinClass: z.enum(CABIN_CLASSES).default('ECONOMY'),
  preferences: z.object({
    priority: z.enum(PRIORITIES).default('BALANCED'),
    maxPrice: z.coerce.number().positive().max(10000000).nullish(),
    nonStopOnly: z.boolean().default(false),
    maxDurationMinutes: z.coerce.number().int().positive().max(2880).nullish(),
    departurePreference: z.enum(DEPARTURE_WINDOWS).nullish(),
  }).default({}),
  naturalLanguage: z.string().trim().max(300).optional(),
}).superRefine((value, ctx) => {
  if (value.origin === value.destination) {
    ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Departure and arrival airports must be different' });
  }
  const date = new Date(`${value.departureDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({ code: 'custom', path: ['departureDate'], message: 'Choose a valid travel date' });
  } else if (value.departureDate < istDay()) {
    ctx.addIssue({ code: 'custom', path: ['departureDate'], message: 'Travel date cannot be in the past' });
  } else if (date.getTime() - Date.now() > MAX_DAYS_AHEAD * 86400000) {
    ctx.addIssue({ code: 'custom', path: ['departureDate'], message: `Choose a date within the next ${MAX_DAYS_AHEAD} days` });
  }
});
