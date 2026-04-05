import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(100000, 'Message content must be at most 100,000 characters'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
