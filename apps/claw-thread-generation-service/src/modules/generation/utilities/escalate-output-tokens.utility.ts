import type { Locale } from '@claw/shared-types';

import {
  LOCALE_TOKEN_FACTOR,
  OUTPUT_TOKENS_HARD_MAX,
  TRUNCATION_RETRY_MIN_FACTOR,
} from '../constants/output-retry.constants';

/**
 * Output ceiling for the next ask after a reply was cut off by the limit: at least half again as
 * much, and more for a language whose words cost more tokens (Arabic, Hindi, Russian, ...),
 * never above what a role may ask for.
 */
export function escalatedOutputTokens(current: number, locale: Locale): number {
  const factor = Math.max(TRUNCATION_RETRY_MIN_FACTOR, LOCALE_TOKEN_FACTOR.get(locale) ?? 1);
  return Math.min(OUTPUT_TOKENS_HARD_MAX, Math.ceil(current * factor));
}
