import { z } from 'zod';

export const editPublicationRevisionSchema = z
  .object({
    markdown: z.string().min(1).max(100_000),
    citations: z
      .array(z.object({ evidenceId: z.string().min(1).max(128), url: z.string().url().max(2048) }))
      .min(1)
      .max(100),
    capMicroUsd: z.number().int().safe().positive(),
    idempotencyKey: z.string().min(1).max(200),
    correlationId: z.string().min(1).max(200),
  })
  .strict();

export type EditPublicationRevisionDto = z.infer<typeof editPublicationRevisionSchema>;
