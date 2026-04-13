import { z } from 'zod';

export const reviewCaseSchema = z.object({
  isConfirmedRegression: z.boolean(),
  reviewNotes: z.string().max(2000).optional(),
});

export type ReviewCaseDto = z.infer<typeof reviewCaseSchema>;
