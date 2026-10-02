import { z } from 'zod';

import {
  CRAWL_MAX_LINK_DEPTH,
  CRAWL_MAX_PAGES_CEILING,
} from '../../../common/constants/crawl.constants';
import { RUNTIME_CRAWL_CEILINGS } from '../constants/runtime-crawl.constants';

export const updateRuntimeCrawlConfigSchema = z
  .object({
    enabled: z.boolean(),
    maxPagesPerRun: z.number().int().min(0).max(CRAWL_MAX_PAGES_CEILING),
    maxLinkDepth: z.number().int().min(0).max(CRAWL_MAX_LINK_DEPTH),
    maxConcurrentRunsPerUser: z
      .number()
      .int()
      .min(0)
      .max(RUNTIME_CRAWL_CEILINGS.maxConcurrentRunsPerUser),
    dailyPageBudgetPerUser: z
      .number()
      .int()
      .min(0)
      .max(RUNTIME_CRAWL_CEILINGS.dailyPageBudgetPerUser),
    maxRunsPerUserPerDay: z.number().int().min(0).max(RUNTIME_CRAWL_CEILINGS.maxRunsPerUserPerDay),
    maxTextCharsPerPage: z.number().int().min(100).max(RUNTIME_CRAWL_CEILINGS.maxTextCharsPerPage),
    maxLinksPerPage: z.number().int().min(0).max(RUNTIME_CRAWL_CEILINGS.maxLinksPerPage),
    runTimeoutSeconds: z.number().int().min(10).max(RUNTIME_CRAWL_CEILINGS.runTimeoutSeconds),
  })
  .partial()
  .strict();

export type UpdateRuntimeCrawlConfigDto = z.infer<typeof updateRuntimeCrawlConfigSchema>;
