import { z } from 'zod';

export const setPublicationReactionSchema = z.object({
  value: z.enum(['LIKE', 'DISLIKE']),
});

export type SetPublicationReactionDto = z.infer<typeof setPublicationReactionSchema>;
