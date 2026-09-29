import { z } from 'zod';

/** chat-service → memory-service: which packs could "add this to a pack" use? */
export const packOptionsForChatSchema = z.object({
  userId: z.string().min(1).max(255),
});

export type PackOptionsForChatDto = z.infer<typeof packOptionsForChatSchema>;
