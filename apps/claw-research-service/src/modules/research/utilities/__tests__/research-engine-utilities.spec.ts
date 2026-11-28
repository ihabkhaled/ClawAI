import { describe, expect, it } from 'vitest';

import { EVIDENCE_FETCH_TOP_N } from '../../../../common/constants/evidence.constants';
import { RESEARCH_DEPTH_BUDGETS } from '../../../../common/constants/research-engine.constants';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { collapseQuery, normaliseQueryKey, planExpansionQueries } from '../query-expansion.utility';
import { fuseQueryResults } from '../query-fusion.utility';
import { depthBudgetOf, isEngineRequest } from '../research-depth.utility';
import type { SearchResult } from '../../../search/types/search.types';

const hit = (url: string, extra: Partial<SearchResult> = {}): SearchResult => ({
  id: url,
  title: url,
  url,
  snippet: null,
  publishedAt: null,
  freshness: null,
  score: 0.9,
  providerKind: SearchProviderKind.OLLAMA_WEB,
  ...extra,
});

describe('RESEARCH_DEPTH_BUDGETS / depthBudgetOf', () => {
  it('matches the contract table', () => {
    expect(RESEARCH_DEPTH_BUDGETS.map((row) => [row.queries, row.fetchTopN])).toEqual([
      [1, EVIDENCE_FETCH_TOP_N],
      [2, 8],
      [4, 8],
      [6, 12],
      [10, 16],
      [14, 20],
    ]);
    expect(EVIDENCE_FETCH_TOP_N).toBe(8);
  });

  it('returns the row for 0-5 and null when absent or outside the table', () => {
    expect(depthBudgetOf(3)).toEqual({ queries: 6, fetchTopN: 12 });
    expect(depthBudgetOf(0)).toEqual({ queries: 1, fetchTopN: 8 });
    // Depth 1 never reads fewer pages than a request with no depth (chat-service sends it by default).
    expect(depthBudgetOf(1)).toEqual({ queries: 2, fetchTopN: 8 });
    expect(depthBudgetOf(undefined)).toBeNull();
    expect(depthBudgetOf(6)).toBeNull();
    expect(depthBudgetOf(-1)).toBeNull();
    expect(depthBudgetOf(1.5)).toBeNull();
  });
});

describe('isEngineRequest', () => {
  const dto = { intent: 'x y', workflow: ResearchWorkflowKind.SEARCH_ONLY };

  it('is false for an old-shape request', () => {
    expect(isEngineRequest(dto)).toBe(false);
    expect(isEngineRequest({ ...dto, searchQuery: 'q', maxResults: 5, correlationId: 'c' })).toBe(
      false,
    );
  });

  it.each([
    { threadId: 't' },
    { queries: [] },
    { languages: ['en'] },
    { depth: 0 },
    { round: 1 },
    { excludeUrls: [] },
  ])('is true when %o is present', (extra) => {
    expect(isEngineRequest({ ...dto, ...extra })).toBe(true);
  });
});

describe('query expansion planning', () => {
  it('collapses whitespace and lower-cases the key', () => {
    expect(collapseQuery('  EU   AI\tact ')).toBe('EU AI act');
    expect(normaliseQueryKey('  EU   AI\tact ')).toBe('eu ai act');
  });

  it('drops queries equal to the primary or to each other, case-insensitively', () => {
    expect(
      planExpansionQueries('EU AI Act', ['eu ai act', 'AI act fines', 'ai  ACT fines', 'gpai'], 5),
    ).toEqual(['AI act fines', 'gpai']);
  });

  it('caps at the budget, keeping the caller order', () => {
    expect(planExpansionQueries('p', ['a1', 'a2', 'a3', 'a4'], 2)).toEqual(['a1', 'a2']);
  });

  it('a cap of 0 (depth absent or depth 0) plans nothing', () => {
    expect(planExpansionQueries('p', ['a1', 'a2'], 0)).toEqual([]);
  });

  it('skips blank entries', () => {
    expect(planExpansionQueries('p', ['   ', 'a1'], 3)).toEqual(['a1']);
  });
});

describe('fuseQueryResults (reciprocal-rank fusion)', () => {
  it('ranks a page several queries agree on above single-query pages', () => {
    const fused = fuseQueryResults([
      { query: 'primary', results: [hit('https://a.example/1'), hit('https://b.example/2')] },
      { query: 'second', results: [hit('https://c.example/3'), hit('https://b.example/2')] },
    ]);

    expect(fused.map((result) => result.url)).toEqual([
      'https://b.example/2',
      'https://a.example/1',
      'https://c.example/3',
    ]);
    expect(fused[0]?.score).toBe(1);
    expect(fused[1]?.score).toBeLessThan(1);
  });

  it('keeps the first query that found a page as provenance (primary first)', () => {
    const fused = fuseQueryResults([
      { query: 'primary', results: [hit('https://b.example/2')] },
      { query: 'second', results: [hit('https://b.example/2'), hit('https://c.example/3')] },
    ]);

    expect(fused.find((r) => r.url === 'https://b.example/2')?.query).toBe('primary');
    expect(fused.find((r) => r.url === 'https://c.example/3')?.query).toBe('second');
  });

  it('dedupes by canonical URL and enriches snippet, date and providers', () => {
    const fused = fuseQueryResults([
      {
        query: 'q1',
        results: [hit('https://www.a.example/x/?utm_source=t', { providers: ['P1'] })],
      },
      {
        query: 'q2',
        results: [
          hit('http://a.example/x', {
            snippet: 'from q2',
            publishedAt: '2026-01-01',
            providers: ['P2'],
          }),
        ],
      },
    ]);

    expect(fused).toHaveLength(1);
    expect(fused[0]).toMatchObject({
      url: 'https://www.a.example/x/?utm_source=t',
      snippet: 'from q2',
      publishedAt: '2026-01-01',
      query: 'q1',
      providers: ['P1', 'P2'],
    });
  });

  it('returns nothing for no results', () => {
    expect(fuseQueryResults([{ query: 'q', results: [] }])).toEqual([]);
  });
});

describe('fusion weights (owner lyric lookup, 2026-11-28)', () => {
  const weighted = (url: string) => ({
    id: url,
    title: url,
    url,
    snippet: null,
    publishedAt: null,
    freshness: null,
    score: 1,
    providerKind: SearchProviderKind.SERPAPI,
  });

  it('keeps the primary query ahead of encyclopedia rows that share its ranks', () => {
    const fused = fuseQueryResults([
      { query: 'primary', results: [weighted('https://lyrics.test/song')], weight: 2 },
      { query: 'primary', results: [weighted('https://wiki.test/a')], weight: 0.6 },
      { query: 'expansion', results: [weighted('https://other.test/b')] },
    ]);
    expect(fused.map((result) => result.url)).toEqual([
      'https://lyrics.test/song',
      'https://other.test/b',
      'https://wiki.test/a',
    ]);
  });
});
