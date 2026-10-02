import { z } from 'zod';

import { RUNTIME_CRAWL_MAX_PAGES_PAGE_SIZE } from '../constants/runtime-crawl.constants';

export const runtimeCrawlPagesQuerySchema = z.object({
  /** Return pages with an ordinal greater than this (cursor from `nextAfter`). */
  after: z.coerce.number().int().min(-1).default(-1),
  limit: z.coerce.number().int().min(1).max(RUNTIME_CRAWL_MAX_PAGES_PAGE_SIZE).optional(),
});

export type RuntimeCrawlPagesQueryDto = z.infer<typeof runtimeCrawlPagesQuerySchema>;
