import { z } from 'zod';

export const listRecipesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  isEnabled: z.coerce.boolean().optional(),
});

export type ListRecipesQueryDto = z.infer<typeof listRecipesQuerySchema>;
