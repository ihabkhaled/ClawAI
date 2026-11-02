import { z } from 'zod';

/** The stored body of a revision: Markdown with source markers, and the sources they point at. */
export const translationSourceContentSchema = z.object({
  markdown: z.string(),
  citations: z
    .array(z.object({ url: z.string().url(), evidenceId: z.string().optional() }))
    .default([]),
});
