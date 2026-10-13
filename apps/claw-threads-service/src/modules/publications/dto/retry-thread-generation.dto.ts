import { z } from 'zod';

export const retryThreadGenerationSchema = z
  .object({
    idempotencyKey: z.string().min(1).max(200),
    topic: z.string().min(10).max(10_000).optional(),
    spendCapUsd: z.number().positive().max(1000).optional(),
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

export type RetryThreadGenerationDto = z.infer<typeof retryThreadGenerationSchema>;
