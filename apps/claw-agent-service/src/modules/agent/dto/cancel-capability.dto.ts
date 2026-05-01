import { z } from 'zod';

export const cancelCapabilitySchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CancelCapabilityDto = z.infer<typeof cancelCapabilitySchema>;
