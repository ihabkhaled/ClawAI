import { z } from 'zod';

export const latestRevisionContentSchema = z.object({
  markdown: z.string(),
  citations: z.array(z.object({ evidenceId: z.string(), url: z.string() })).default([]),
});
