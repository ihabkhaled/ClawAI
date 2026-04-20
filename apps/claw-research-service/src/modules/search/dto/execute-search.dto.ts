import { z } from 'zod';

import {
  SEARCH_MAX_MAX_RESULTS,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../../common/constants/search.constants';

export const executeSearchSchema = z.object({
  /** Provider id (preferred) or — if omitted — the first enabled provider is used. */
  providerId: z.string().min(1).max(64).optional(),
  query: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(SEARCH_MAX_QUERY_LENGTH),
  maxResults: z.number().int().min(1).max(SEARCH_MAX_MAX_RESULTS).optional(),
  filters: z.record(z.unknown()).optional(),
});

export type ExecuteSearchDto = z.infer<typeof executeSearchSchema>;
