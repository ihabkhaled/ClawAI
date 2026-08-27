import { z } from 'zod';

import { MAX_IN_THREAD_SEARCH_RESULTS } from '../constants/in-thread-search.constants';

/**
 * In-thread message search.
 *
 * A minimum of two characters, because a one-character term matches most of a
 * conversation and the result is a list nobody can use rather than a search.
 */
export const searchMessagesQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(MAX_IN_THREAD_SEARCH_RESULTS).default(50),
});

export type SearchMessagesQueryDto = z.infer<typeof searchMessagesQuerySchema>;
