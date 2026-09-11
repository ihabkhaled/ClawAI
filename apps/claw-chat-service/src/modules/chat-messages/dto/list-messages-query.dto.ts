import { z } from 'zod';

/**
 * `before` is a message id (cuid), not a page number.
 *
 * Offset pagination (`page`/`limit`) shifts its window whenever a row is
 * appended between two requests: the message that used to end page 1 becomes
 * the message that starts page 2, so a client holding both pages renders it
 * twice, or — if only page 2 is re-fetched — never sees it at all. A cursor
 * anchored to a specific message's id has no such window: "everything before
 * this exact row" means the same thing regardless of what gets inserted above
 * it. Omitted, it means "the newest messages."
 */
export const listMessagesQuerySchema = z.object({
  before: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;
