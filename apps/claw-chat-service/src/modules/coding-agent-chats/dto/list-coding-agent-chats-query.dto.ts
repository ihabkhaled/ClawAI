import { z } from 'zod';
import { SortOrder } from '../../../common/enums';

export const listCodingAgentChatsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255, 'Search must be at most 255 characters').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
});

export type ListCodingAgentChatsQueryDto = z.infer<typeof listCodingAgentChatsQuerySchema>;
