import { z } from 'zod';

// Query string of every paginated list: optional search text plus page and page size.
export const pageQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
