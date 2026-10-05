import { z } from 'zod';

export const createPublicationChangeRequestSchema = z.object({
  suggestion: z.string().trim().min(1).max(5000),
});

export type CreatePublicationChangeRequestDto = z.infer<
  typeof createPublicationChangeRequestSchema
>;
