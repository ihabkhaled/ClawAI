import { z } from 'zod';
import { CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

/** chat-service → memory-service: "add this to my context pack" said in a chat. */
export const savePackFromChatSchema = z.object({
  userId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS),
  /** The user message that asked; the idempotency key. */
  sourceMessageId: z.string().min(1).max(58),
});

export type SavePackFromChatDto = z.infer<typeof savePackFromChatSchema>;
