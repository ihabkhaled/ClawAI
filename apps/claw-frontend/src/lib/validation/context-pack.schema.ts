import { z } from 'zod';

import { CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS } from '@/constants';

export const createContextPackSchema = z.object({
  name: z
    .string()
    .min(1, 'Context pack name is required')
    .max(255, 'Name must be at most 255 characters'),
  description: z.string().max(1000, 'Description must be at most 1,000 characters').optional(),
  scope: z.string().max(255, 'Scope must be at most 255 characters').optional(),
});

export const createContextPackItemSchema = z.object({
  type: z.string().min(1, 'Item type is required').max(50, 'Type must be at most 50 characters'),
  content: z
    .string()
    .max(CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS, 'Content must be at most 250,000 characters')
    .optional(),
  fileId: z.string().max(255, 'File ID must be at most 255 characters').optional(),
  sortOrder: z
    .number()
    .min(0, 'Sort order must be at least 0')
    .max(10000, 'Sort order must be at most 10,000')
    .optional(),
});

export type CreateContextPackInput = z.infer<typeof createContextPackSchema>;
export type CreateContextPackItemInput = z.infer<typeof createContextPackItemSchema>;
