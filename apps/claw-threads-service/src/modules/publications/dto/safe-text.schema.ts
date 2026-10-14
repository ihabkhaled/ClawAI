import { z } from 'zod';

import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { TOPIC_MIN_DENSE_CHARACTERS, TOPIC_MIN_WEIGHT } from '../constants/topic-length.constants';
import { isTopicLongEnough } from '../utilities/topic-length.utility';

/** In unicode mode a valid pair is one code point, so this matches only a lone surrogate half. */
const LONE_SURROGATE = /[\uD800-\uDFFF]/u;

/** NUL and a lone surrogate half cannot be stored in PostgreSQL text or JSON; they would fail late and leak a budget. */
export function isStorableText(value: string): boolean {
  return !value.includes('\u0000') && !LONE_SURROGATE.test(value);
}

const TEXT_INVALID_MESSAGE =
  'This text contains a character that cannot be saved. Remove it and try again.';

/** A bounded single-purpose string (ids, keys, provider and model names) that must be storable. */
export function safeText(min: number, max: number): z.ZodString {
  return z
    .string()
    .min(min)
    .max(max)
    .refine(isStorableText, {
      message: TEXT_INVALID_MESSAGE,
      params: { code: ThreadGenerationErrorCode.TEXT_INVALID },
    });
}

export const TOPIC_MAX_LENGTH = 10_000;

/**
 * A topic is trimmed first, then measured in user-perceived letters and numbers (script-aware, see
 * `topic-length.utility.ts`), and must be long enough
 * and storable. Both failures answer the same code so a client has one thing to show.
 */
export function topicText(): z.ZodString {
  return z
    .string()
    .trim()
    .max(TOPIC_MAX_LENGTH)
    .refine((value) => isTopicLongEnough(value) && isStorableText(value), {
      message: `Describe the topic in at least ${String(TOPIC_MIN_WEIGHT)} letters or numbers (${String(TOPIC_MIN_DENSE_CHARACTERS)} for Chinese, Japanese or Korean), without control or broken characters.`,
      params: { code: ThreadGenerationErrorCode.TOPIC_INVALID },
    });
}
