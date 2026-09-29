import { z } from 'zod';
import { CHAT_PACKS_MAX } from '../constants/context-packs-for-chat.constants';

export const packsForChatSchema = z.object({
  userId: z.string().min(1).max(255),
  threadId: z.string().min(1).max(255).optional(),
  packIds: z.array(z.string().min(1).max(64)).max(CHAT_PACKS_MAX).default([]),
});

export type PacksForChatDto = z.infer<typeof packsForChatSchema>;
