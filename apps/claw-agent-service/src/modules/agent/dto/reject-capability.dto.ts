import { z } from 'zod';

export const rejectCapabilitySchema = z.object({
  reason: z.string().min(5).max(500),
});

export type RejectCapabilityDto = z.infer<typeof rejectCapabilitySchema>;
