import { Locale } from '@claw/shared-types';
import { z } from 'zod';

import {
  CATALOG_DEFAULT_LIMIT,
  CATALOG_MAX_LIMIT,
  CATALOG_QUERY_MAX,
  KEY_PATTERN,
  SLUG_PATTERN,
} from '../constants/catalog.constants';

export const catalogListQuerySchema = z.object({
  q: z.string().trim().max(CATALOG_QUERY_MAX).optional(),
  category: z.string().regex(KEY_PATTERN).optional(),
  cursor: z.string().regex(SLUG_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(CATALOG_MAX_LIMIT).default(CATALOG_DEFAULT_LIMIT),
  locale: z.enum(Locale).optional(),
});

export const catalogDetailQuerySchema = z.object({ locale: z.enum(Locale).optional() });

export const catalogSlugSchema = z.string().regex(SLUG_PATTERN);

export type CatalogListQuery = z.infer<typeof catalogListQuerySchema>;
export type CatalogDetailQuery = z.infer<typeof catalogDetailQuerySchema>;
