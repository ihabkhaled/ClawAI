import { describe, expect, it } from 'vitest';

import { BoardErrorCode } from '../enums/board-error-code.enum';
import { boardListQuerySchema, boardSuggestQuerySchema } from '../dto/board-query.dto';

interface ParseResult {
  readonly success: boolean;
  readonly error?: {
    readonly issues: readonly { code: string; params?: Record<string, unknown> }[];
  };
}

function codeOf(result: ParseResult): unknown {
  return result.error?.issues.find((issue) => issue.code === 'custom')?.params?.['code'];
}

const NUL = String.fromCodePoint(0);

describe('board query DTOs', () => {
  it('applies defaults', () => {
    expect(boardListQuerySchema.parse({})).toEqual({
      sort: 'latest',
      lang: 'all',
      type: 'all',
      page: 1,
      limit: 12,
    });
  });

  it('trims and strips control characters (other than NUL) from q', () => {
    expect(boardListQuerySchema.parse({ q: '  hi\u0001there ' }).q).toBe('hi there');
    expect(boardSuggestQuerySchema.parse({ q: ' ab ' }).q).toBe('ab');
  });

  it('rejects bad input', () => {
    expect(boardListQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ limit: 13 }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ sort: 'x' }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ lang: 'xx' }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ type: 'x' }).success).toBe(false);
    expect(boardSuggestQuerySchema.safeParse({}).success).toBe(false);
  });

  it('answers a coded 400 for NUL, over-long and empty search text (D-B06)', () => {
    expect(codeOf(boardListQuerySchema.safeParse({ q: `a${NUL}b` }))).toBe(
      BoardErrorCode.QUERY_INVALID,
    );
    expect(codeOf(boardListQuerySchema.safeParse({ q: NUL }))).toBe(BoardErrorCode.QUERY_INVALID);
    expect(codeOf(boardListQuerySchema.safeParse({ q: 'x'.repeat(101) }))).toBe(
      BoardErrorCode.QUERY_TOO_LONG,
    );
    expect(codeOf(boardSuggestQuerySchema.safeParse({ q: 'x'.repeat(101) }))).toBe(
      BoardErrorCode.QUERY_TOO_LONG,
    );
    expect(codeOf(boardListQuerySchema.safeParse({ q: '   ' }))).toBe(
      BoardErrorCode.QUERY_TOO_SHORT,
    );
    expect(boardListQuerySchema.safeParse({ q: 'x'.repeat(100) }).success).toBe(true);
  });

  it('enforces the 2 character suggest minimum (B-02) but not for the list', () => {
    expect(codeOf(boardSuggestQuerySchema.safeParse({ q: 'v' }))).toBe(
      BoardErrorCode.QUERY_TOO_SHORT,
    );
    expect(boardSuggestQuerySchema.safeParse({ q: '苗' }).success).toBe(false);
    expect(boardSuggestQuerySchema.safeParse({ q: '免疫' }).success).toBe(true);
    expect(boardListQuerySchema.safeParse({ q: 'v' }).success).toBe(true);
  });

  it('accepts any sane page number so a deep page is an empty page, not a 400 (D-B06)', () => {
    expect(boardListQuerySchema.parse({ page: '501' }).page).toBe(501);
    expect(boardListQuerySchema.parse({ page: '1000' }).page).toBe(1000);
    expect(boardListQuerySchema.safeParse({ page: '100001' }).success).toBe(false);
  });

  it('accepts valid filters', () => {
    const parsed = boardListQuerySchema.parse({
      lang: 'en',
      type: 'guide',
      limit: '48',
      page: '500',
      sort: 'liked',
    });
    expect(parsed).toMatchObject({
      lang: 'en',
      type: 'guide',
      limit: 48,
      page: 500,
      sort: 'liked',
    });
  });

  it('answers a coded 400 for a page above the cap and words the minimum correctly', () => {
    expect(codeOf(boardListQuerySchema.safeParse({ page: '100001' }))).toBe(
      BoardErrorCode.PAGE_OUT_OF_RANGE,
    );
    expect(boardListQuerySchema.safeParse({ page: '100000' }).success).toBe(true);
    const empty = boardListQuerySchema.safeParse({ q: '' });
    expect(empty.error?.issues[0]?.message).toBe('Search text must be at least 1 character.');
    const short = boardSuggestQuerySchema.safeParse({ q: 'v' });
    expect(short.error?.issues[0]?.message).toMatch(/at least \d+ characters\./u);
  });
});
