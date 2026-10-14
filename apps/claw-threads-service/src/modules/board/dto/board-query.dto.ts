import { z } from 'zod';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import {
  BOARD_ALL,
  BOARD_DEFAULT_LIMIT,
  BOARD_PAGE_INPUT_CAP,
  BOARD_QUERY_MAX_LENGTH,
  BOARD_SORTS,
  BOARD_SUGGEST_MIN_LENGTH,
} from '../constants/board.constants';
import { BoardErrorCode } from '../enums/board-error-code.enum';
import { charCount, stripControlChars } from '../utilities/board-text.utility';

const NUL = '\u0000';

/**
 * Search text: NUL is refused (it cannot be stored or searched), other control characters become
 * spaces, and the trimmed text must be 1 to 100 characters. Each refusal carries a machine code.
 */
function queryText(minLength: number): z.ZodType<string, string> {
  const base = z.string().superRefine((value, ctx) => {
    if (value.includes(NUL)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Search text contains a character that cannot be searched.',
        params: { code: BoardErrorCode.QUERY_INVALID },
      });
    }
  });
  return base
    .transform((value) => stripControlChars(value).trim())
    .pipe(
      z
        .string()
        .refine((value) => charCount(value) >= minLength, {
          message: `Search text must be at least ${String(minLength)} characters.`,
          params: { code: BoardErrorCode.QUERY_TOO_SHORT },
        })
        .refine((value) => charCount(value) <= BOARD_QUERY_MAX_LENGTH, {
          message: `Search text must be at most ${String(BOARD_QUERY_MAX_LENGTH)} characters.`,
          params: { code: BoardErrorCode.QUERY_TOO_LONG },
        }),
    );
}

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
  q: queryText(1).optional(),
  sort: z.enum(BOARD_SORTS).default('latest'),
  lang: langSchema,
  type: typeSchema,
  page: z.coerce.number().int().min(1).max(BOARD_PAGE_INPUT_CAP).default(1),
  limit: limitSchema,
});

export const boardSuggestQuerySchema = z.object({
  q: queryText(BOARD_SUGGEST_MIN_LENGTH),
  lang: langSchema,
});

export type BoardListQuery = z.infer<typeof boardListQuerySchema>;
export type BoardSuggestQuery = z.infer<typeof boardSuggestQuerySchema>;
