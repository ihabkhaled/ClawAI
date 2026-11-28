import { z } from 'zod';

import { SEARCH_MIN_QUERY_LENGTH } from '../../../common/constants/search.constants';
import { PLATFORM_TEST_QUERY_MAX_LENGTH } from '../constants/platform-admin.constants';

/** `POST /research/platforms/:id/test` body; the query defaults to `PLATFORM_TEST_DEFAULT_QUERY`. */
export const testResearchPlatformSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(SEARCH_MIN_QUERY_LENGTH)
      .max(PLATFORM_TEST_QUERY_MAX_LENGTH)
      .optional(),
  })
  .strict()
  .default({});

export type TestResearchPlatformDto = z.infer<typeof testResearchPlatformSchema>;
