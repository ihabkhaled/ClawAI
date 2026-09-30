import { z } from 'zod';

/**
 * Where to rewind to.
 *
 * Every message after this one is deleted; this one is kept. The id is matched
 * against the thread inside the repository transaction, so a message from
 * another conversation cannot be used to truncate this one.
 */
export const rewindThreadSchema = z
  .object({
    afterMessageId: z
      .string()
      .trim()
      .min(1, 'Message ID is required')
      .max(255, 'Message ID must be at most 255 characters'),
  })
  .strict();

export type RewindThreadDto = z.infer<typeof rewindThreadSchema>;
