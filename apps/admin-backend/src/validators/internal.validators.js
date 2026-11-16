import { z } from 'zod';

// Sent by the user backend when a traveller creates, edits or cancels a request.
export const internalEventSchema = z.object({
  event: z.enum(['booking:new', 'booking:update']),
  bookingId: z.string(),
  bookingReference: z.string(),
  status: z.string(),
});
