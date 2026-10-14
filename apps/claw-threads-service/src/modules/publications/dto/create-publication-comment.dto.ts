import { z } from 'zod';

import { isStorableText } from './safe-text.schema';

export const createPublicationCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .refine(isStorableText, { message: 'This text contains a character that cannot be saved.' }),
  /** The comment being replied to. Its conversation (root) is derived on the server. */
  parentId: z.string().min(1).max(64).optional(),
});

export type CreatePublicationCommentDto = z.infer<typeof createPublicationCommentSchema>;
