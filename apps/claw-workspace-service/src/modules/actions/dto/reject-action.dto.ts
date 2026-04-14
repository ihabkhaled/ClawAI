import { z } from 'zod';

export const rejectActionSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export type RejectActionDto = z.infer<typeof rejectActionSchema>;
