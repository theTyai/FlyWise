import { z } from 'zod';

export const accountStatusSchema = z.object({ accountStatus: z.enum(['ACTIVE', 'SUSPENDED']) }).strict();
