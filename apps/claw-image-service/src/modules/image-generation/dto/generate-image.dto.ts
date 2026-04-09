import { z } from 'zod';

export const generateImageSchema = z.object({
  prompt: z.string().min(1).max(4000),
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  userId: z.string().min(1).max(100),
  threadId: z.string().max(100).optional(),
  messageId: z.string().max(100).optional(),
  width: z.number().int().min(256).max(4096).optional(),
  height: z.number().int().min(256).max(4096).optional(),
  quality: z.string().max(20).optional(),
  style: z.string().max(20).optional(),
});

export type GenerateImageDto = z.infer<typeof generateImageSchema>;

export const listImagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListImagesQueryDto = z.infer<typeof listImagesQuerySchema>;
