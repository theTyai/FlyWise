import { z } from 'zod';

export const settingsSchema = z.object({ defaultSimulatedSeats: z.coerce.number().int().min(0).max(500) }).strict();
