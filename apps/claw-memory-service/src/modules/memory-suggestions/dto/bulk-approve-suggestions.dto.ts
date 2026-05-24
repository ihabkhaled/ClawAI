import { z } from 'zod';

export const bulkApproveSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string().min(1).max(64)).min(1).max(100),
});

export type BulkApproveSuggestionsDto = z.infer<typeof bulkApproveSuggestionsSchema>;
