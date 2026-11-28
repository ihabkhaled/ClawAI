import { z } from 'zod';

import {
  GOOGLE_MAX_PAGES_CONFIG_KEY,
  GOOGLE_MAX_PAGES_MAX,
  GOOGLE_MAX_PAGES_MIN,
  GOOGLE_MAX_QUERIES_CONFIG_KEY,
  GOOGLE_MAX_QUERIES_MAX,
  GOOGLE_MAX_QUERIES_MIN,
} from '../../../common/constants/research-engine.constants';

/**
 * A search provider's non-secret config. Free-form (adapters read their own keys; `expansion` is a boolean),
 * except the two SERPAPI Google budget overrides (ADR-228), which are checked when they are set: whole
 * numbers inside their range. Every other key passes through untouched.
 */
export const searchProviderPublicConfigSchema = z.looseObject({
  [GOOGLE_MAX_QUERIES_CONFIG_KEY]: z
    .number()
    .int()
    .min(GOOGLE_MAX_QUERIES_MIN)
    .max(GOOGLE_MAX_QUERIES_MAX)
    .optional(),
  [GOOGLE_MAX_PAGES_CONFIG_KEY]: z
    .number()
    .int()
    .min(GOOGLE_MAX_PAGES_MIN)
    .max(GOOGLE_MAX_PAGES_MAX)
    .optional(),
});
