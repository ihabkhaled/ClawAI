import { z } from 'zod';

import { safeText, topicText } from './safe-text.schema';
import { MIN_THREAD_SPEND_CAP_USD } from '../constants/generation-preflight.constants';

export const retryThreadGenerationSchema = z
  .object({
    idempotencyKey: safeText(1, 200),
    topic: topicText().optional(),
    spendCapUsd: z.number().min(MIN_THREAD_SPEND_CAP_USD).max(1000).optional(),
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
  })
  .strict();

export type RetryThreadGenerationDto = z.infer<typeof retryThreadGenerationSchema>;
