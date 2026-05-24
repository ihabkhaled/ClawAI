import { z } from 'zod';

export const rejectSuggestionSchema = z.object({
  reason: z.string().max(255).optional(),
  suppressSimilar: z.boolean().default(false),
});

export type RejectSuggestionDto = z.infer<typeof rejectSuggestionSchema>;
