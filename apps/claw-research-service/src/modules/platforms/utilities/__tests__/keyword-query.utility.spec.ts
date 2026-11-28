import { describe, expect, it } from 'vitest';

import { toKeywordQuery } from '../keyword-query.utility';

describe('toKeywordQuery', () => {
  it('cuts a question-shaped query to its first keywords (measured: the full text matched nothing)', () => {
    expect(toKeywordQuery('Rust vs Go backend services 2026 community opinions benchmarks')).toBe(
      'Rust Go backend services',
    );
  });

  it('keeps the characters code names use and drops trailing punctuation', () => {
    expect(toKeywordQuery('How do C++ and C# compare to node.js async-await?')).toBe(
      'C++ C# node.js async-await',
    );
  });

  it('keeps non-Latin words and honours the term limit', () => {
    expect(toKeywordQuery('الصيام المتقطع وأمراض القلب والشرايين اليوم', 3)).toBe(
      'الصيام المتقطع وأمراض',
    );
  });

  it('keeps the query as it was when nothing but filler remains', () => {
    expect(toKeywordQuery('what is the best')).toBe('what is the best');
    expect(toKeywordQuery('2026')).toBe('2026');
  });
});
