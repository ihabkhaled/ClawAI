import { z } from 'zod';
import { MemoryType } from '../../../generated/prisma';
import { MEMORY_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

/** chat-service → memory-service: "save this as memory" said in a chat. */
export const saveMemoryFromChatSchema = z.object({
  userId: z.string().min(1).max(255),
  type: z.nativeEnum(MemoryType),
  content: z.string().min(1).max(MEMORY_CONTENT_MAX_CHARS),
  sourceThreadId: z.string().min(1).max(255),
  /** The user message that asked; the idempotency key. */
  sourceMessageId: z.string().min(1).max(255),
});

export type SaveMemoryFromChatDto = z.infer<typeof saveMemoryFromChatSchema>;
