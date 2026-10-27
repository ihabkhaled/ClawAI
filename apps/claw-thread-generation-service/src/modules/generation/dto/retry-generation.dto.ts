import { ThreadArticleLength } from '@claw/shared-types';
import { z } from 'zod';

import { ACCEPTED_GAP_MAX_CHARS, ACCEPTED_GAPS_MAX } from '../constants/accepted-gaps.constants';
import { healingPoolSchema } from '../types/generation-pipeline.types';

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
    articleLength: z.nativeEnum(ThreadArticleLength).optional(),
    /** True runs a fresh research pass; the failed job's saved research is not inherited. */
    refreshResearch: z.boolean().optional(),
    /** Evidence-gap blocker texts the owner accepts; the article discloses them (ADR-194). */
    acceptedEvidenceGaps: z
      .array(z.string().trim().min(1).max(ACCEPTED_GAP_MAX_CHARS))
      .max(ACCEPTED_GAPS_MAX)
      .optional(),
    /**
     * Indexes into `progress.failure.review.evidenceGapBlockers` of the failed job; the client need
     * not echo the text. Checked against the stored verdict like the texts (ADR-195).
     */
    acceptedEvidenceGapIndexes: z
      .array(
        z
          .number()
          .int()
          .min(0)
          .max(ACCEPTED_GAPS_MAX - 1),
      )
      .max(ACCEPTED_GAPS_MAX)
      .optional(),
    /** Recomputed by threads-service for the retry; the stored pool is kept when absent. */
    healing: healingPoolSchema.optional(),
  })
  .strict();

export type RetryGenerationDto = z.infer<typeof retryGenerationSchema>;
