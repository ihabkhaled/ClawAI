import { z } from 'zod';

export const createThreadSchema = z.object({
  title: z.string().max(255, 'Title must be at most 255 characters').optional(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
