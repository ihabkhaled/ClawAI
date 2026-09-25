import { z } from 'zod';

export const updateFetchStrategySchema = z.object({
  enabled: z.boolean().optional(),
  tier: z.number().int().min(0).max(100).optional(),
  timeoutMs: z.number().int().min(1_000).max(60_000).optional(),
  publicConfig: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateFetchStrategyDto = z.infer<typeof updateFetchStrategySchema>;
