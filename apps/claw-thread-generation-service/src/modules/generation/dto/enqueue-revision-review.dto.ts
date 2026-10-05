import { z } from 'zod';

import { authorDraftSchema, modelRoleSchema } from '../types/generation-pipeline.types';

const spendCapSchema = z
  .string()
  .regex(/^\d{1,16}$/u)
  .refine((amount) => Number.isSafeInteger(Number(amount)) && Number(amount) > 0);

export const enqueueRevisionReviewSchema = z
  .object({
    ownerId: z.string().min(1).max(64),
    parentJobId: z.string().min(1).max(64),
    idempotencyKey: z.string().min(1).max(200),
    correlationId: z.string().min(1).max(200),
    spendCapMicroUsd: spendCapSchema,
    draft: authorDraftSchema,
  })
  .strict();

export const revisionReviewJobRequestSchema = enqueueRevisionReviewSchema
  .extend({
    kind: z.literal('revision-review'),
    topic: z.string().min(10).max(10_000),
    publicationType: z.enum(['article', 'research-article', 'guide', 'technical-explanation']),
    authors: z.array(modelRoleSchema).min(3).max(5),
    judge: modelRoleSchema,
    critic: modelRoleSchema,
  })
  .strict();

export type EnqueueRevisionReviewDto = z.infer<typeof enqueueRevisionReviewSchema>;
export type RevisionReviewJobRequest = z.infer<typeof revisionReviewJobRequestSchema>;
