import { z } from 'zod';
import { CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

/**
 * chat-service → memory-service: add text a chat asked to save to one of the
 * user's EXISTING packs. The pack's owner is checked against `userId`; a pack
 * that is someone else's is refused, never silently created instead.
 */
export const addItemFromChatSchema = z.object({
  userId: z.string().min(1).max(255),
  content: z.string().min(1).max(CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS),
  sourceMessageId: z.string().min(1).max(58),
});

export type AddItemFromChatDto = z.infer<typeof addItemFromChatSchema>;
