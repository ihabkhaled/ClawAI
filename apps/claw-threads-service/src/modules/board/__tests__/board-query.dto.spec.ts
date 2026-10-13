import { describe, expect, it } from 'vitest';

import { boardListQuerySchema, boardSuggestQuerySchema } from '../dto/board-query.dto';

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

  it('trims and strips control characters from q', () => {
    expect(boardListQuerySchema.parse({ q: '  hi\u0000there ' }).q).toBe('hi there');
    expect(boardSuggestQuerySchema.parse({ q: ' ab ' }).q).toBe('ab');
  });

  it('rejects bad input', () => {
    expect(boardListQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ page: 501 }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ limit: 13 }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ sort: 'x' }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ lang: 'xx' }).success).toBe(false);
    expect(boardListQuerySchema.safeParse({ type: 'x' }).success).toBe(false);
    expect(boardSuggestQuerySchema.safeParse({}).success).toBe(false);
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
});
