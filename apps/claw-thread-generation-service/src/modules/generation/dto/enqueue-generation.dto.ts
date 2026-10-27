import { z } from 'zod';
import { Locale, ThreadArticleLength, ThreadPublicationType } from '@claw/shared-types';

import { healingPoolSchema, modelRoleSchema } from '../types/generation-pipeline.types';

export const enqueueGenerationSchema = z
  .object({
    ownerId: z.string().min(1).max(64),
    sourceThreadId: z.string().min(1).max(64),
    idempotencyKey: z.string().min(1).max(200),
    correlationId: z.string().min(1).max(200),
    spendCapMicroUsd: z
      .string()
      .regex(/^\d{1,16}$/u)
      .refine((amount) => Number.isSafeInteger(Number(amount)) && Number(amount) > 0),
    topic: z.string().min(10).max(10_000),
    publicationType: z.nativeEnum(ThreadPublicationType),
    contentLocale: z.nativeEnum(Locale),
    publicIntentVersion: z.string().min(1).max(32),
    authors: z.array(modelRoleSchema).min(3).max(5),
    judge: modelRoleSchema,
    critic: modelRoleSchema,
    /** Models the ladder may swap in after a role's own backups (ADR-181). */
    healing: healingPoolSchema.optional(),
    articleLength: z.nativeEnum(ThreadArticleLength).optional(),
    /** Set by an owner retry that asked for a fresh research pass (ADR-193). */
    refreshResearch: z.boolean().optional(),
  })
  .strict();

export type EnqueueGenerationDto = z.infer<typeof enqueueGenerationSchema>;
