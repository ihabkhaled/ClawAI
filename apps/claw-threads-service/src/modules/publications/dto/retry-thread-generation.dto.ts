import { ThreadArticleLength } from '@claw/shared-types';
import { z } from 'zod';

import { isStorableText, safeText, topicText } from './safe-text.schema';

/** Most evidence gaps one retry may accept, and the longest text of one (ADR-194). */
export const ACCEPTED_GAPS_MAX = 8;
export const ACCEPTED_GAP_MAX_CHARS = 300;

export const retryThreadGenerationSchema = z
  .object({
    idempotencyKey: safeText(1, 200),
    topic: topicText().optional(),
    spendCapUsd: z.number().positive().max(1000).optional(),
    models: z
      .array(
        z.object({
          roleId: safeText(1, 64),
          provider: safeText(1, 100),
          model: safeText(1, 200),
        }),
      )
      .max(7)
      .optional(),
    articleLength: z.nativeEnum(ThreadArticleLength).optional(),
    /** True asks for a fresh research pass instead of the failed job's saved research (ADR-193). */
    refreshResearch: z.boolean().optional(),
    /**
     * Evidence-gap blocker texts of the failed review the owner accepts; the article then states
     * each one in a limitations section (ADR-194). Taken from `progress.failure.review`.
     */
    acceptedEvidenceGaps: z
      .array(z.string().trim().min(1).max(ACCEPTED_GAP_MAX_CHARS).refine(isStorableText))
      .max(ACCEPTED_GAPS_MAX)
      .optional(),
  })
  .strict();

export type RetryThreadGenerationDto = z.infer<typeof retryThreadGenerationSchema>;
