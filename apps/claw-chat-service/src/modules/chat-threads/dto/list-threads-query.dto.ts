import { z } from 'zod';
import { SortOrder } from '../../../common/enums';
import { ThreadOrigin } from '../../../generated/prisma';

export const listThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255, 'Search must be at most 255 characters').optional(),
  isPinned: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isArchived: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  // Omitted means WEB. A chat list that defaulted to every origin would put
  // the coding agent's runs back beside the user's own conversations, which is
  // the separation this exists to make.
  origin: z.nativeEnum(ThreadOrigin).default(ThreadOrigin.WEB),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
});

export type ListThreadsQueryDto = z.infer<typeof listThreadsQuerySchema>;
