import { z } from 'zod';
import {
  UNPRICED_LIST_DEFAULT_PAGE_SIZE,
  UNPRICED_LIST_MAX_PAGE_SIZE,
} from '../constants/model-cost-catalog.constants';

export const listUnpricedModelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(UNPRICED_LIST_MAX_PAGE_SIZE)
    .default(UNPRICED_LIST_DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(200).optional(),
});

export type ListUnpricedModelsQueryDto = z.infer<typeof listUnpricedModelsQuerySchema>;
