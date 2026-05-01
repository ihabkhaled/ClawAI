import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(100_000),
});

export const ChatCompletionSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(200),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(64_000).optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string().max(200), z.array(z.string().max(200)).max(10)]).optional(),
  model: z.string().max(200).optional(),
});

export type ChatMessageDto = z.infer<typeof ChatMessageSchema>;
export type ChatCompletionDto = z.infer<typeof ChatCompletionSchema>;
