import { z } from 'zod';
import {
  MemoryScope,
  MemorySensitivity,
  MemorySource,
  MemoryType,
} from '../../../generated/prisma';

const MEMORY_SORT_VALUES = [
  'newest',
  'oldest',
  'most_used',
  'lowest_confidence',
  'expiring_soon',
] as const;

export const listMemoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(MemoryType).optional(),
  isEnabled: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().max(255).optional(),
  // V2 filters
  scope: z.nativeEnum(MemoryScope).optional(),
  scopeRef: z.string().max(255).optional(),
  source: z.nativeEnum(MemorySource).optional(),
  sensitivity: z.nativeEnum(MemorySensitivity).optional(),
  tag: z.string().max(64).optional(),
  category: z.string().max(64).optional(),
  pinnedOnly: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sort: z.enum(MEMORY_SORT_VALUES).default('newest'),
});

export type ListMemoriesQueryDto = z.infer<typeof listMemoriesQuerySchema>;
export type MemorySort = (typeof MEMORY_SORT_VALUES)[number];
