import { describe, expect, it } from 'vitest';

import {
  RESEARCH_PRIMARY_FUSION_GROUP,
  RESEARCH_RRF_K,
} from '../../../../common/constants/research-engine.constants';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { fuseQueryResults } from '../query-fusion.utility';
import type { SearchResult } from '../../../search/types/search.types';

const hit = (url: string, snippet: string | null = null): SearchResult => ({
  id: url,
  title: url,
  url,
  snippet,
  publishedAt: null,
  freshness: null,
  score: 1,
  providerKind: SearchProviderKind.SERPAPI,
});

const A = 'https://a.example/1';
const B = 'https://b.example/2';
const C = 'https://c.example/3';
const group = RESEARCH_PRIMARY_FUSION_GROUP;

describe('fuseQueryResults: deeper results pages of one query (ADR-228)', () => {
  it('a page that starts below the ranks above it scores like a deep rank, not like rank 1', () => {
    const shallow = fuseQueryResults([{ query: 'q', results: [hit(A), hit(B)] }]);
    const deep = fuseQueryResults([
      { query: 'q', results: [hit(A)] },
      { query: 'q', results: [hit(B)], rankOffset: 10, group },
    ]);

    const shallowB = shallow.find((result) => result.url === B)?.score ?? 0;
    const deepB = deep.find((result) => result.url === B)?.score ?? 0;
    expect(deepB).toBeLessThan(shallowB);
    // B at rank 11 against A at rank 1.
    expect(deepB).toBeCloseTo(1 / (RESEARCH_RRF_K + 11) / (1 / (RESEARCH_RRF_K + 1)), 10);
  });

  it('a page seen on page 1 and again on page 2 counts once, at its first rank (not as agreement)', () => {
    const fused = fuseQueryResults([
      { query: 'q', results: [hit(A), hit(B)], weight: 2, group },
      { query: 'q', results: [hit(B), hit(C)], rankOffset: 10, group },
      { query: 'other', results: [hit(C)] },
    ]);

    expect(fused.map((result) => result.url)).toEqual([A, B, C]);
    const scoreOf = (url: string): number => fused.find((result) => result.url === url)?.score ?? 0;
    expect(scoreOf(B)).toBeCloseTo(2 / (RESEARCH_RRF_K + 2) / (2 / (RESEARCH_RRF_K + 1)), 10);
    // C is agreement between two DIFFERENT queries, so it does add up.
    expect(scoreOf(C)).toBeCloseTo(
      (1 / (RESEARCH_RRF_K + 12) + 1 / (RESEARCH_RRF_K + 1)) / (2 / (RESEARCH_RRF_K + 1)),
      10,
    );
  });

  it('without a group, the same page in two sets is agreement and adds up (unchanged)', () => {
    const fused = fuseQueryResults([
      { query: 'q', results: [hit(A), hit(B)] },
      { query: 'r', results: [hit(B)] },
    ]);

    expect(fused.map((result) => result.url)).toEqual([B, A]);
  });

  it('a repeat still lends its snippet to the page it repeats', () => {
    const fused = fuseQueryResults([
      { query: 'q', results: [hit(A)], group },
      { query: 'q', results: [hit(A, 'from page two')], rankOffset: 10, group },
    ]);

    expect(fused).toHaveLength(1);
    expect(fused[0]?.snippet).toBe('from page two');
  });
});
