import { z } from 'zod';

export const rollbackCapabilitySchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RollbackCapabilityDto = z.infer<typeof rollbackCapabilitySchema>;
