import { z } from 'zod';

import {
  OWNER_PAGE_DEFAULT_SIZE,
  OWNER_PAGE_MAX_PAGE,
  OWNER_PAGE_MAX_SIZE,
  OWNER_PAGE_QUERY_MAX_CHARS,
  OWNER_PAGE_STATUS_FILTERS,
} from '../constants/publication-owner-page.constants';
import { isStorableText } from './safe-text.schema';

/** `GET thread-publications/mine/page` query (ADR-205). Anything else is the standard 400. */
export const listOwnedPublicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(OWNER_PAGE_MAX_PAGE).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(OWNER_PAGE_MAX_SIZE)
    .default(OWNER_PAGE_DEFAULT_SIZE),
  q: z
    .string()
    .trim()
    .max(OWNER_PAGE_QUERY_MAX_CHARS)
    .refine(isStorableText, { message: 'q contains a character that cannot be searched' })
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  status: z.enum(OWNER_PAGE_STATUS_FILTERS).default('ALL'),
});

export type ListOwnedPublicationsQuery = z.infer<typeof listOwnedPublicationsQuerySchema>;
