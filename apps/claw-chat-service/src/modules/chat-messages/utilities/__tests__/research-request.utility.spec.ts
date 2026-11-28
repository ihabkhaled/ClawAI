import { describe, expect, it } from 'vitest';

import {
  buildResearchEngineFields,
  clampResearchDepth,
  evidenceUrlKey,
  evidenceUrls,
  expansionQueries,
  maxRoundsForDepth,
  newEvidenceOnly,
  normaliseResearchLanguages,
  researchQueryBudget,
  researchQueryKey,
} from '../research-request.utility';
import {
  mergeResearchRuns,
  statsNarrationParams,
  summariseCrawl,
} from '../research-orchestration.utility';

// Research engine B1/B2: what the search step sends to research-service, inside the shared wire contract.

const runOf = (urls: string[], workflow = 'SEARCH_THEN_FETCH'): never =>
  ({
    id: `run-${workflow}`,
    workflow,
    bundle: {
      items: urls.map((url) => ({ id: url, title: `T ${url}`, url, snippet: `S ${url}` })),
      warnings: [],
      toolsUsed: [workflow],
      helperModels: [],
      providerSelection: { providerId: null },
    },
  }) as never;

describe('depth and rounds', () => {
  it('clamps depth to 0..RESEARCH_MAX_DEPTH (3); unreadable is 0', () => {
    expect([undefined, Number.NaN, -2, 0, 1, 2.4, 3, 5].map(clampResearchDepth)).toEqual([
      0, 0, 0, 0, 1, 2, 3, 3,
    ]);
  });

  it('allows one round up to depth 1, then one per depth level, never more than 3', () => {
    expect([0, 1, 2, 3, 5].map(maxRoundsForDepth)).toEqual([1, 1, 2, 3, 3]);
  });
});

describe('queries and languages', () => {
  it('sends the sub-questions minus the primary query, de-duplicated, trimmed and capped', () => {
    const many = Array.from({ length: 20 }, (_, index) => `question ${String(index)}`);
    expect(
      expansionQueries('Primary  Query', [' primary query ', 'b', 'Second?', 'second?', ...many]),
    ).toEqual(['Second?', ...many.slice(0, 11)]);
    expect(expansionQueries('p', ['x'.repeat(400)])[0]).toHaveLength(300);
    expect(researchQueryKey('  A  b ')).toBe('a b');
  });

  it('turns council language tags into base ISO codes the wire accepts', () => {
    expect(
      normaliseResearchLanguages([
        'pt-BR',
        'zh-Hans',
        'AR',
        'ar',
        'english',
        'x',
        'fil',
        'de',
        'fr',
        'es',
        'it',
      ]),
    ).toEqual(['pt', 'zh', 'ar', 'fil', 'de', 'fr']);
  });
});

describe('buildResearchEngineFields', () => {
  it('bounds every field to the contract and leaves empty ones out', () => {
    const urls = Array.from({ length: 70 }, (_, index) => `https://u${String(index)}.test/`);
    const fields = buildResearchEngineFields({
      threadId: ' th-1 ',
      queries: [' a ', '', ...Array.from({ length: 20 }, (_, index) => `q${String(index)}`)],
      languages: ['en-GB', 'en'],
      depth: 9,
      round: 7,
      excludeUrls: [...urls, urls[0] ?? ''],
    });
    expect(fields.threadId).toBe('th-1');
    expect(fields.queries).toHaveLength(12);
    expect(fields.queries?.[0]).toBe('a');
    expect(fields.languages).toEqual(['en']);
    expect(fields.depth).toBe(3);
    expect(fields.round).toBe(5);
    expect(fields.excludeUrls).toHaveLength(60);
    expect(buildResearchEngineFields({ queries: [], languages: [], excludeUrls: [] })).toEqual({});
  });

  it('drops a thread id longer than 64 characters, and keeps depth 0', () => {
    expect(buildResearchEngineFields({ threadId: 'x'.repeat(65), depth: 0 })).toEqual({ depth: 0 });
  });
});

describe('evidence across rounds', () => {
  it('reads the distinct URLs of a run, one key per page', () => {
    expect(evidenceUrls(runOf(['https://a.test', 'https://A.test/', 'https://b.test#x']))).toEqual([
      'https://a.test',
      'https://b.test#x',
    ]);
    expect(evidenceUrls(null)).toEqual([]);
    expect(evidenceUrlKey(' https://A.test/x/#top ')).toBe('https://a.test/x');
  });

  it('keeps only pages not read before, or nothing', () => {
    const fresh = newEvidenceOnly(runOf(['https://a.test/', 'https://c.test']), [
      'https://a.test',
    ]) as unknown as {
      bundle: { items: Array<{ url: string }> };
    };
    expect(fresh.bundle.items.map((item) => item.url)).toEqual(['https://c.test']);
    expect(newEvidenceOnly(runOf(['https://a.test']), ['https://a.test/'])).toBeNull();
    expect(newEvidenceOnly(null, [])).toBeNull();
  });

  it('merges two rounds of one workflow under one name, a crawl and a search under both', () => {
    const rounds = mergeResearchRuns(
      runOf(['https://a.test']),
      runOf(['https://b.test']),
    ) as unknown as {
      workflow: string;
    };
    expect(rounds.workflow).toBe('SEARCH_THEN_FETCH');
    const mixed = mergeResearchRuns(
      runOf(['https://a.test'], 'SITE_CRAWL'),
      runOf(['https://b.test']),
    ) as unknown as {
      workflow: string;
    };
    expect(mixed.workflow).toBe('SITE_CRAWL+SEARCH_THEN_FETCH');
  });

  it('shows the planner the crawl in untrusted fences', () => {
    expect(summariseCrawl(runOf(['https://a.test']))).toContain(
      '<web_source n="1" url="https://a.test" trust="untrusted">\nTitle: T https://a.test\nS https://a.test\n</web_source>',
    );
    expect(summariseCrawl(null)).toBe('Nothing could be read from the site.');
  });

  it('narrates only measured engine counters', () => {
    const bundle = (stats: unknown): never => ({ items: [], warnings: [], stats }) as never;
    expect(statsNarrationParams(bundle(undefined))).toEqual({});
    expect(
      statsNarrationParams(bundle({ queriesRun: 4, languages: ['ar', 3], duplicatesRemoved: -1 })),
    ).toEqual({
      queries: 4,
      languages: 'ar',
    });
  });

  describe('query budget per depth (mirrors research-service)', () => {
    it('gives 1/2/4/6 queries for depth 0-3 and clamps above the chat maximum', () => {
      expect([0, 1, 2, 3].map(researchQueryBudget)).toEqual([1, 2, 4, 6]);
      expect(researchQueryBudget(5)).toBe(6);
      expect(researchQueryBudget(-1)).toBe(1);
    });

    it('caps expansion queries at the given limit', () => {
      expect(expansionQueries('p', ['aa', 'bb', 'cc', 'dd'], 2)).toEqual(['aa', 'bb']);
      expect(expansionQueries('p', ['aa'], 0)).toEqual([]);
    });
  });
});
