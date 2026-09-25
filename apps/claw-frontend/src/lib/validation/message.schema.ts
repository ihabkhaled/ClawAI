import { z } from 'zod';

// Words OR files: an attachment sent on its own is a complete message. The
// server applies the same rule (chat-service's requireContentOrAttachments).
export const sendMessageSchema = z
  .object({
    content: z.string().max(100000, 'Message content must be at most 100,000 characters'),
    fileCount: z.number().int().min(0).default(0),
  })
  .refine((value) => value.content.trim().length > 0 || value.fileCount > 0, {
    message: 'Message content is required',
    path: ['content'],
  });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
