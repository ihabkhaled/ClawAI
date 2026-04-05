import { z } from 'zod';

import { MemoryType } from '@/enums';

const memoryTypeValues = Object.values(MemoryType) as [string, ...string[]];

export const createMemorySchema = z.object({
  type: z.enum(memoryTypeValues, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid memory type',
    }),
  }),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be at most 50,000 characters'),
  sourceThreadId: z.string().max(255, 'Source thread ID must be at most 255 characters').optional(),
  sourceMessageId: z
    .string()
    .max(255, 'Source message ID must be at most 255 characters')
    .optional(),
});

export const updateMemorySchema = z.object({
  content: z
    .string()
    .min(1, 'Content must be at least 1 character')
    .max(50000, 'Content must be at most 50,000 characters')
    .optional(),
  isEnabled: z.boolean().optional(),
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
