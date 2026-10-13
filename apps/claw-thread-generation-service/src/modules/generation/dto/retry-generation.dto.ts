import { z } from 'zod';

export const retryGenerationSchema = z
  .object({
    ownerId: z.string().min(1).max(64),
    idempotencyKey: z.string().min(1).max(200),
    topic: z.string().min(10).max(10_000).optional(),
    spendCapUsd: z.number().positive().max(1_000_000).optional(),
    models: z
      .array(
        z.object({
          roleId: z.string().min(1).max(64),
          provider: z.string().min(1).max(100),
          model: z.string().min(1).max(200),
        }),
      )
      .max(7)
      .optional(),
  })
  .strict();

export type RetryGenerationDto = z.infer<typeof retryGenerationSchema>;
