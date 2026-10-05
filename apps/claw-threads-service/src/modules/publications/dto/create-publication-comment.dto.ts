import { z } from 'zod';

export const createPublicationCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export type CreatePublicationCommentDto = z.infer<typeof createPublicationCommentSchema>;
