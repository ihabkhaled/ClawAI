import { type SearchResult } from '../../types/search.types';
import { canonicalUrlKey } from '../canonical-url.utility';
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

const set = (provider: string, ...results: SearchResult[]) => ({ provider, results });

describe('mergeProviderResults', () => {
  it('combines what every provider found instead of only the first', () => {
    const merged = mergeProviderResults([
      set('a', result({ url: 'https://a.example/1' })),
      set('b', result({ url: 'https://b.example/2' })),
    ]);
    expect(merged.map((r) => r.url)).toEqual(
      expect.arrayContaining(['https://a.example/1', 'https://b.example/2']),
    );
  });

  it('treats the same page as one result and lists every provider that returned it', () => {
    const merged = mergeProviderResults([
      set('a', result({ url: 'https://www.example.com/page/?utm_source=x' })),
      set('b', result({ url: 'https://example.com/page' })),
      set('c', result({ url: 'http://EXAMPLE.com/page#frag' })),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.providers).toEqual(['a', 'b', 'c']);
  });

  it('normalises scores per provider: a generous scale does not win', () => {
    const merged = mergeProviderResults([
      set('a', result({ url: 'https://a.example/1', score: 0.99 })),
      set('b', result({ url: 'https://b.example/1', score: 0.1 })),
    ]);
    expect(merged[0]?.score).toBe(merged[1]?.score);
  });

  it('ranks by position inside each provider list', () => {
    const merged = mergeProviderResults([
      set(
        'a',
        result({ url: 'https://a.example/first', score: 0.1 }),
        result({ url: 'https://a.example/second', score: 0.9 }),
      ),
    ]);
    expect(merged.map((r) => r.url)).toEqual([
      'https://a.example/first',
      'https://a.example/second',
    ]);
    expect(merged[0]?.score).toBe(1);
    expect(merged[1]?.score).toBeLessThan(1);
  });

  it('ranks a page several providers agreed on above one only one found', () => {
    const merged = mergeProviderResults([
      set(
        'a',
        result({ url: 'https://solo.example/y' }),
        result({ url: 'https://agreed.example/x' }),
      ),
      set('b', result({ url: 'https://agreed.example/x' })),
      set('c', result({ url: 'https://agreed.example/x' })),
    ]);
    expect(merged[0]?.url).toBe('https://agreed.example/x');
    expect(merged[0]?.providers).toEqual(['a', 'b', 'c']);
  });

  it('keeps the snippet from whichever provider supplied one', () => {
    const merged = mergeProviderResults([
      set('a', result({ url: 'https://example.com/p', snippet: null })),
      set('b', result({ url: 'https://example.com/p', snippet: 'the useful description' })),
    ]);
    expect(merged[0]?.snippet).toBe('the useful description');
  });

  it('keeps an unparseable URL rather than dropping the result', () => {
    expect(mergeProviderResults([set('a', result({ url: 'not a url' }))])).toHaveLength(1);
  });

  it('caps the score at 1 for any number of providers', () => {
    const sets = Array.from({ length: 7 }, (_, i) =>
      set(`p${String(i)}`, result({ url: 'https://example.com/same' })),
    );
    const merged = mergeProviderResults(sets);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.score).toBe(1);
    expect(merged[0]?.providers).toHaveLength(7);
  });
});

describe('canonicalUrlKey', () => {
  it.each([
    ['https://www.Example.com/a/?utm_medium=x&b=2&a=1', 'https://example.com/a?a=1&b=2'],
    ['http://example.com/a/#top', 'https://example.com/a'],
    ['https://example.com:443/a?fbclid=zzz', 'https://example.com/a'],
  ])('%s is the same page as %s', (left, right) => {
    expect(canonicalUrlKey(left)).toBe(canonicalUrlKey(right));
  });

  it('keeps path case and distinct pages apart', () => {
    expect(canonicalUrlKey('https://example.com/A')).not.toBe(
      canonicalUrlKey('https://example.com/a'),
    );
    expect(canonicalUrlKey('https://example.com/a?q=1')).not.toBe(
      canonicalUrlKey('https://example.com/a?q=2'),
    );
  });
});
