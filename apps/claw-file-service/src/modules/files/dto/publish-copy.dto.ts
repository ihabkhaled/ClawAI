import { z } from 'zod';

/**
 * The request chat-service sends when publishing a conversation that carries
 * images.
 *
 * Only the source id: the copy's owner, mime type and size are all read from the
 * source row, because a caller that could name them could also mislabel them.
 */
export const publishCopySchema = z.object({
  sourceFileId: z.string().trim().min(1).max(128),
});

export type PublishCopyDto = z.infer<typeof publishCopySchema>;
