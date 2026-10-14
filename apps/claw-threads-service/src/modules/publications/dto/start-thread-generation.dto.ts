import { z } from 'zod';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { safeText, topicText } from './safe-text.schema';

const MIN_AUTHORS = 3;
const MAX_AUTHORS = 5;

function enumValue<T extends string>(
  values: Record<string, T>,
  code: string,
  message: string,
): z.ZodType<T> {
  const allowed: readonly string[] = Object.values(values);
  return z.custom<T>((value) => typeof value === 'string' && allowed.includes(value), {
    message,
    params: { code },
  });
}

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
    capMicroUsd: z
      .number()
      .int()
      .safe()
      .refine((value) => value > 0, {
        message: 'Set a spend cap above zero.',
        params: { code: ThreadGenerationErrorCode.SPEND_CAP_TOO_LOW },
      }),
    sourceThreadId: safeText(1, 64),
    idempotencyKey: safeText(1, 200),
    correlationId: safeText(1, 200),
    publicIntentVersion: z.literal('threads-public-v1'),
    contentLocale: enumValue(
      Locale,
      ThreadGenerationErrorCode.LOCALE_INVALID,
      'Choose a supported content language.',
    ),
    topic: topicText(),
    publicationType: enumValue(
      ThreadPublicationType,
      ThreadGenerationErrorCode.PUBLICATION_TYPE_INVALID,
      'Choose a supported publication type.',
    ),
    authors: z
      .array(modelRoleSchema)
      .refine((authors) => authors.length >= MIN_AUTHORS && authors.length <= MAX_AUTHORS, {
        message: `Choose between ${String(MIN_AUTHORS)} and ${String(MAX_AUTHORS)} authors.`,
        params: { code: ThreadGenerationErrorCode.AUTHOR_COUNT_INVALID },
      }),
    judge: modelRoleSchema,
    critic: modelRoleSchema,
  })
  .strict();

export type StartThreadGenerationDto = z.infer<typeof startThreadGenerationSchema>;
