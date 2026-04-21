import { z } from 'zod';

export const cancelCommandSchema = z.object({
  reason: z.string().min(1).max(512).optional(),
});

export type CancelCommandDto = z.infer<typeof cancelCommandSchema>;
