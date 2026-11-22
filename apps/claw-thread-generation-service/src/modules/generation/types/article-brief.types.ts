import { z } from 'zod';

import { BRIEF_QUERIES_MAX } from '../constants/article-brief.constants';

/** The planner's reply: long items are trimmed by the caller, never refused for length. */
export const articleBriefSchema = z.object({
  subject: z.string().trim().min(3).max(1_000),
  researchQueries: z
    .array(z.string())
    .max(BRIEF_QUERIES_MAX * 3)
    .default([]),
});

/** What research is about: the subject the planner derived and the queries it proposed. */
export type ArticleBrief = { subject: string; researchQueries: string[] };
