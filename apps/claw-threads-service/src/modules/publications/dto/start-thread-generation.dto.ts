import { z } from 'zod';

const modelRoleSchema = z.object({
  id: z.string().min(1).max(64),
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  maxOutputTokens: z.number().int().min(256).max(32_768),
  fallbacks: z
    .array(z.object({ provider: z.string().min(1).max(100), model: z.string().min(1).max(200) }))
    .max(3)
    .default([]),
});

export const startThreadGenerationSchema = z
  .object({
    capMicroUsd: z.number().int().safe().positive(),
    sourceThreadId: z.string().min(1).max(64),
    idempotencyKey: z.string().min(1).max(200),
    correlationId: z.string().min(1).max(200),
    publicIntentVersion: z.literal('threads-public-v1'),
    topic: z.string().min(10).max(10_000),
    publicationType: z.enum(['article', 'research-article', 'guide', 'technical-explanation']),
    authors: z.array(modelRoleSchema).min(3).max(5),
    judge: modelRoleSchema,
    critic: modelRoleSchema,
  })
  .strict();

export type StartThreadGenerationDto = z.infer<typeof startThreadGenerationSchema>;
