import { z } from 'zod';

export const runtimeProbeQuerySchema = z.object({
  includeModels: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  timeoutMs: z.coerce.number().int().min(100).max(30000).default(5000),
});

export type RuntimeProbeQueryDto = z.infer<typeof runtimeProbeQuerySchema>;
