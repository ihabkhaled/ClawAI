import { z } from 'zod';

export const generateSchema = z.object({
  model: z.string().min(1, 'Model is required').max(255, 'Model must be at most 255 characters'),
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(100000, 'Prompt must be at most 100000 characters'),
  stream: z.boolean().optional(),
  images: z.array(z.string().max(20_000_000)).max(10).optional(),
});

export type GenerateDto = z.infer<typeof generateSchema>;
