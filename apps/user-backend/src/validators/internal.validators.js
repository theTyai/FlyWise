import { z } from 'zod';
import { isValidId } from '@flywise/shared/db.js';

// Sent by the admin backend after it has saved a decision and its notification.
export const internalEventSchema = z.object({
  userId: z.string().refine(isValidId),
  notification: z.record(z.any()).optional(),
  booking: z.object({ bookingId: z.string(), status: z.string() }).optional(),
});
