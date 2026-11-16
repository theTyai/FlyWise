import { z } from 'zod';
import { STORED_STATUSES } from '@flywise/shared/constants.js';
import { pageQuerySchema } from './common.js';

export const listBookingsSchema = pageQuerySchema.extend({ status: z.enum(STORED_STATUSES).optional() });

// Rejecting and revoking always need a reason: the traveller sees it and the audit log stores it.
export const reasonSchema = z.object({
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters so the traveller knows why').max(300),
}).strict();
