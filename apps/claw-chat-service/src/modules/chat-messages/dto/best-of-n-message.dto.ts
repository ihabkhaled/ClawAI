import { z } from 'zod';
import { researchFields } from './research-fields.dto';

export const bestOfNMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
  threadId: z.string().max(255).optional(),
  n: z.number().int().min(2).max(5).default(3),
  models: z.array(z.string().max(255)).max(5).optional(),
  ...researchFields,
});

export type BestOfNMessageDto = z.infer<typeof bestOfNMessageSchema>;
