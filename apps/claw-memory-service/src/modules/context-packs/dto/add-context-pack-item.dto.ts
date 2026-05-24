import { z } from 'zod';
import { ContextPackItemType } from '../../../generated/prisma';

export const addContextPackItemSchema = z.object({
  itemType: z.nativeEnum(ContextPackItemType).optional(),
  // Back-compat for old callers that sent free-text type
  type: z.string().max(50).optional(),
  content: z.string().max(50000).optional(),
  fileId: z.string().max(255).optional(),
  url: z.string().url().max(2048).optional(),
  memoryRefId: z.string().max(64).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isEnabled: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export type AddContextPackItemDto = z.infer<typeof addContextPackItemSchema>;
