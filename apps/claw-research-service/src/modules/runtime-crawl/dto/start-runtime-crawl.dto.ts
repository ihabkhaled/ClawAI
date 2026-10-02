import { z } from 'zod';

import {
  CRAWL_MAX_LINK_DEPTH,
  CRAWL_MAX_PAGES_CEILING,
} from '../../../common/constants/crawl.constants';
import { RUNTIME_CRAWL_MAX_INTENT_LENGTH } from '../constants/runtime-crawl.constants';

export const startRuntimeCrawlSchema = z.object({
  url: z.string().url().max(2048),
  /** `crawl` = sitemap + same-site links; `extract` = this one page only. */
  profile: z.enum(['crawl', 'extract']).default('crawl'),
  maxPages: z.number().int().min(1).max(CRAWL_MAX_PAGES_CEILING).optional(),
  maxDepth: z.number().int().min(0).max(CRAWL_MAX_LINK_DEPTH).optional(),
  /** What the caller is after; ranks which pages are read first. */
  intent: z.string().max(RUNTIME_CRAWL_MAX_INTENT_LENGTH).optional(),
});

export type StartRuntimeCrawlDto = z.infer<typeof startRuntimeCrawlSchema>;
