import { ThreadArticleLength } from '@claw/shared-types';
import { z } from 'zod';

import { safeText, topicText } from './safe-text.schema';

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
  })
  .strict();

export type RetryThreadGenerationDto = z.infer<typeof retryThreadGenerationSchema>;
