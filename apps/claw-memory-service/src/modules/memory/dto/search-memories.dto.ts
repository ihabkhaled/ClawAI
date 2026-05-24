import { z } from 'zod';
import { MemoryScope } from '../../../generated/prisma';

export const searchMemoriesSchema = z.object({
  query: z.string().min(1).max(2048),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  scope: z.nativeEnum(MemoryScope).optional(),
  scopeRef: z.string().max(255).optional(),
  includeDisabled: z.boolean().default(false),
});

export type SearchMemoriesDto = z.infer<typeof searchMemoriesSchema>;
