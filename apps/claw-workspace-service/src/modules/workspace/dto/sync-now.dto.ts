import { z } from 'zod';

export const syncNowQuerySchema = z
  .object({
    delta: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    priority: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    dryRun: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();

export type SyncNowQueryDto = z.infer<typeof syncNowQuerySchema>;
