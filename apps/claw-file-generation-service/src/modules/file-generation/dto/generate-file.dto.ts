import { z } from 'zod';

export const generateFileSchema = z.object({
  prompt: z.string().min(1).max(4000),
  content: z.string().min(1).max(10_000_000),
  format: z.string().min(1).max(10),
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  userId: z.string().min(1).max(100),
  threadId: z.string().max(100).optional(),
  userMessageId: z.string().max(100).optional(),
  assistantMessageId: z.string().max(100).optional(),
  filename: z.string().max(255).optional(),
});

export type GenerateFileDto = z.infer<typeof generateFileSchema>;

export const listFileGenerationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFileGenerationsQueryDto = z.infer<typeof listFileGenerationsQuerySchema>;
