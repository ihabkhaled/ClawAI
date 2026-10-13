import { z } from 'zod';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import {
  BOARD_ALL,
  BOARD_DEFAULT_LIMIT,
  BOARD_MAX_PAGE,
  BOARD_QUERY_MAX_LENGTH,
  BOARD_SORTS,
} from '../constants/board.constants';
import { stripControlChars } from '../utilities/board-text.utility';

const queryText = z
  .string()
  .transform((value) => stripControlChars(value).trim())
  .pipe(z.string().min(1).max(BOARD_QUERY_MAX_LENGTH));

const langSchema = z.union([z.nativeEnum(Locale), z.literal(BOARD_ALL)]).default(BOARD_ALL);
const typeSchema = z
  .union([z.nativeEnum(ThreadPublicationType), z.literal(BOARD_ALL)])
  .default(BOARD_ALL);

const limitSchema = z.coerce
  .number()
  .int()
  .refine((value) => value === 12 || value === 24 || value === 48, {
    message: 'limit must be 12, 24 or 48',
  })
  .default(BOARD_DEFAULT_LIMIT);

export const boardListQuerySchema = z.object({
  q: queryText.optional(),
  sort: z.enum(BOARD_SORTS).default('latest'),
  lang: langSchema,
  type: typeSchema,
  page: z.coerce.number().int().min(1).max(BOARD_MAX_PAGE).default(1),
  limit: limitSchema,
});

export const boardSuggestQuerySchema = z.object({
  q: queryText,
  lang: langSchema,
});

export type BoardListQuery = z.infer<typeof boardListQuerySchema>;
export type BoardSuggestQuery = z.infer<typeof boardSuggestQuerySchema>;
