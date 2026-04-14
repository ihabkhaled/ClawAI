import { z } from 'zod';

export const rejectCommandSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RejectCommandDto = z.infer<typeof rejectCommandSchema>;
