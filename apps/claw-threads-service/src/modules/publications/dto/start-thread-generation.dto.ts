import { z } from 'zod';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { safeText, topicText } from './safe-text.schema';

const modelRoleSchema = z.object({
  id: safeText(1, 64),
  provider: safeText(1, 100),
  model: safeText(1, 200),
  maxOutputTokens: z.number().int().min(256).max(32_768),
  fallbacks: z
    .array(z.object({ provider: safeText(1, 100), model: safeText(1, 200) }))
    .max(3)
    .default([]),
});

export const startThreadGenerationSchema = z
  .object({
    capMicroUsd: z.number().int().safe().positive(),
    sourceThreadId: safeText(1, 64),
    idempotencyKey: safeText(1, 200),
    correlationId: safeText(1, 200),
    publicIntentVersion: z.literal('threads-public-v1'),
    contentLocale: z.nativeEnum(Locale),
    topic: topicText(),
    publicationType: z.nativeEnum(ThreadPublicationType),
    authors: z.array(modelRoleSchema).min(3).max(5),
    judge: modelRoleSchema,
    critic: modelRoleSchema,
  })
  .strict();

export type StartThreadGenerationDto = z.infer<typeof startThreadGenerationSchema>;
