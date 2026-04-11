import { z } from 'zod';
import { ModelCategory, RuntimeType } from '../../../generated/prisma';
import {
  CATALOG_DEFAULT_LIMIT,
  CATALOG_DEFAULT_PAGE,
  CATALOG_MAX_LIMIT,
  CATALOG_SEARCH_MAX_LENGTH,
} from '../constants/catalog.constants';

export const listCatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(CATALOG_DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(CATALOG_MAX_LIMIT).default(CATALOG_DEFAULT_LIMIT),
  category: z.nativeEnum(ModelCategory).optional(),
  runtime: z.nativeEnum(RuntimeType).optional(),
  search: z.string().max(CATALOG_SEARCH_MAX_LENGTH).optional(),
});

export type ListCatalogQueryDto = z.infer<typeof listCatalogQuerySchema>;
