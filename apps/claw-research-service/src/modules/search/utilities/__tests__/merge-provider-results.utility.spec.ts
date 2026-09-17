import { type SearchResult } from '../../types/search.types';
import { mergeProviderResults } from '../merge-provider-results.utility';

function result(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'r1',
    title: 'Result',
    url: 'https://example.com/page',
    snippet: null,
    publishedAt: null,
    freshness: null,
    score: 0.5,
    providerKind: 'BRAVE' as never,
    ...overrides,
  };
}

describe('mergeProviderResults', () => {
  it('combines what every provider found instead of only the first', () => {
    // A fallback chain stops at the first provider that answers, throwing away
    // everything the others indexed.
    const merged = mergeProviderResults([
      [result({ url: 'https://a.example/1' })],
      [result({ url: 'https://b.example/2', providerKind: 'TAVILY' as never })],
    ]);

    expect(merged.map((r) => r.url)).toEqual(
      expect.arrayContaining(['https://a.example/1', 'https://b.example/2']),
    );
  });

  it('treats the same page as one result across providers', () => {
    // Tracking parameters, a trailing slash and a www prefix are the same page.
    const merged = mergeProviderResults([
      [result({ url: 'https://www.example.com/page/?utm_source=x' })],
      [result({ url: 'https://example.com/page', providerKind: 'TAVILY' as never })],
    ]);

    expect(merged).toHaveLength(1);
  });

  it('ranks a page several providers agreed on above one only one found', () => {
    // Agreement is signal.
    const merged = mergeProviderResults([
      [result({ url: 'https://agreed.example/x', score: 0.6 })],
      [result({ url: 'https://agreed.example/x', score: 0.6, providerKind: 'TAVILY' as never })],
      [result({ url: 'https://solo.example/y', score: 0.62 })],
    ]);

    expect(merged[0]?.url).toBe('https://agreed.example/x');
  });

  it('does not let weak consensus outrank one strong result', () => {
    // The agreement bonus is a tie-breaker, not a vote.
    const merged = mergeProviderResults([
      [result({ url: 'https://weak.example/x', score: 0.2 })],
      [result({ url: 'https://weak.example/x', score: 0.2, providerKind: 'TAVILY' as never })],
      [result({ url: 'https://strong.example/y', score: 0.95 })],
    ]);

    expect(merged[0]?.url).toBe('https://strong.example/y');
  });

  it('keeps the snippet from whichever provider supplied one', () => {
    const merged = mergeProviderResults([
      [result({ url: 'https://example.com/p', snippet: null, score: 0.9 })],
      [
        result({
          url: 'https://example.com/p',
          snippet: 'the useful description',
          score: 0.1,
          providerKind: 'TAVILY' as never,
        }),
      ],
    ]);

    expect(merged[0]?.snippet).toBe('the useful description');
  });

  it('keeps an unparseable URL rather than dropping the result', () => {
    const merged = mergeProviderResults([[result({ url: 'not a url' })]]);
    expect(merged).toHaveLength(1);
  });
});
