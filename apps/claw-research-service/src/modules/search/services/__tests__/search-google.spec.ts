import { describe, expect, it, type Mock, vi } from 'vitest';

import { SEARCH_BREAKER_FAILURE_THRESHOLD } from '../../../../common/constants/search.constants';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { narrowToExpansionProviders } from '../../utilities/expansion-provider.utility';
import { searchCacheKey } from '../../utilities/search-cache-key.utility';
import { SearchExecutionService } from '../search-execution.service';
import { SearchProviderHealthService } from '../search-provider-health.service';
import type { SearchAdapterContext, SearchRequest } from '../../types/search.types';

type Row = ReturnType<typeof provider>;

const provider = (
  kind: SearchProviderKind,
  publicConfig: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) => ({
  id: `p-${kind}`,
  name: `P-${kind}`,
  kind,
  enabled: true,
  status: 'ACTIVE',
  allowlistDomains: [],
  blocklistDomains: [],
  baseUrl: 'https://x.example',
  priority: 1,
  timeoutMs: 5_000,
  publicConfig,
  ...overrides,
});

const hit = (kind: SearchProviderKind, url: string) => ({
  id: url,
  title: url,
  url,
  snippet: null,
  publishedAt: null,
  freshness: null,
  score: 1,
  providerKind: kind,
});

const EXA = provider(SearchProviderKind.EXA);
const OLLAMA = provider(SearchProviderKind.OLLAMA_WEB);
const SERP = provider(SearchProviderKind.SERPAPI);

type Call = { kind: string; request: SearchRequest };

const build = (rows: Row[], options: { failKinds?: string[]; cached?: unknown } = {}) => {
  const calls: Call[] = [];
  const adapterSearch = (kind: string) =>
    vi.fn(async (request: SearchRequest, context: SearchAdapterContext) => {
      calls.push({ kind, request });
      await context.onNetworkCall?.();
      if (options.failKinds?.includes(kind) === true) {
        throw new Error('SerpApi search failed: HTTP 429');
      }
      return {
        results: [hit(kind as SearchProviderKind, `https://${kind.toLowerCase()}.example/1`)],
        latencyMs: 1,
      };
    });
  const recordUsage = vi.fn(async () => {});
  const cache = { read: vi.fn(async () => options.cached ?? null), write: vi.fn(async () => {}) };
  const health = new SearchProviderHealthService();
  const adapters = new Map<string, Mock>();
  const service = new SearchExecutionService(
    {
      findEnabled: vi.fn(async () => rows),
      findById: vi.fn(async (id: string) => rows.find((row) => row.id === id) ?? null),
    } as never,
    {
      create: vi.fn(async () => ({ id: 'run-1', userId: 'u1', providerId: rows[0]?.id })),
      update: vi.fn(async () => ({})),
    } as never,
    {
      buildContext: vi.fn(() => ({
        baseUrl: '',
        credentials: {},
        publicConfig: {},
        timeoutMs: 5000,
      })),
    } as never,
    {
      getAdapter: vi.fn((kind: string) => {
        const adapter = adapters.get(kind) ?? adapterSearch(kind);
        adapters.set(kind, adapter);
        return { search: adapter };
      }),
    } as never,
    { record: recordUsage } as never,
    health,
    cache as never,
  );
  const kindsCalled = (): string[] => calls.map((call) => call.kind).sort();
  return { service, calls, recordUsage, cache, health, kindsCalled };
};

const tripBreaker = (health: SearchProviderHealthService, id: string): void => {
  for (let i = 0; i < SEARCH_BREAKER_FAILURE_THRESHOLD; i += 1) {
    health.recordFailure(id);
  }
};

describe('searchCacheKey: pages and the query language never collide (ADR-228)', () => {
  const ids = ['p-SERPAPI'];

  it('a deeper page has its own key; start 0 or absent is the first page', () => {
    const first = searchCacheKey('eu ai act', ids, 10);

    expect(searchCacheKey('eu ai act', ids, 10, null, 0)).toBe(first);
    expect(searchCacheKey('eu ai act', ids, 10, null, 10)).not.toBe(first);
    expect(searchCacheKey('eu ai act', ids, 10, null, 10)).not.toBe(
      searchCacheKey('eu ai act', ids, 10, null, 20),
    );
  });

  it('the query language (the hl SerpApi gets) is part of the key, alone and with a page', () => {
    const plain = searchCacheKey('eu ai act', ids, 10);

    expect(searchCacheKey('eu ai act', ids, 10, 'de')).not.toBe(plain);
    expect(searchCacheKey('eu ai act', ids, 10, 'de')).not.toBe(
      searchCacheKey('eu ai act', ids, 10, 'fr'),
    );
    expect(searchCacheKey('eu ai act', ids, 10, 'de', 10)).not.toBe(
      searchCacheKey('eu ai act', ids, 10, 'de'),
    );
    expect(searchCacheKey('eu ai act', ids, 10, 'de', 10)).not.toBe(
      searchCacheKey('eu ai act', ids, 10, 'fr', 10),
    );
  });

  it('a key without a page or language is exactly the B2 key', () => {
    expect(searchCacheKey('Eu  AI act', ['b', 'a'], 10, null, 0)).toBe(
      searchCacheKey('eu ai act', ['a', 'b'], 10),
    );
  });
});

describe('narrowToExpansionProviders with a Google route', () => {
  const selection = (rows: Row[]) =>
    ({ primary: rows[0], candidates: rows, mode: 'AUTO', executionMode: 'AUTO_ALL' }) as never;
  const names = (result: ReturnType<typeof narrowToExpansionProviders>) =>
    result?.candidates.map((row) => row.name);

  it('without a route: the plain cost rule (the admin platform test is unchanged)', () => {
    const withFlag = provider(SearchProviderKind.SERPAPI, { expansion: true });

    expect(names(narrowToExpansionProviders(selection([EXA, withFlag, OLLAMA])))).toEqual([
      'P-SERPAPI',
      'P-OLLAMA_WEB',
    ]);
    expect(narrowToExpansionProviders(selection([EXA, SERP]))).toBeNull();
  });

  it('a route to Google adds exactly that SERPAPI provider, in rank order, and no other paid one', () => {
    const result = narrowToExpansionProviders(selection([EXA, SERP, OLLAMA]), {
      providerId: SERP.id,
    });

    expect(names(result)).toEqual(['P-SERPAPI', 'P-OLLAMA_WEB']);
  });

  it('a route to no Google removes SERPAPI even when it is flagged for expansion', () => {
    const flagged = provider(SearchProviderKind.SERPAPI, { expansion: true });

    expect(
      names(narrowToExpansionProviders(selection([flagged, OLLAMA]), { providerId: null })),
    ).toEqual(['P-OLLAMA_WEB']);
    expect(narrowToExpansionProviders(selection([flagged]), { providerId: null })).toBeNull();
  });

  it('another SERPAPI row than the routed one never joins (one governed Google, not two)', () => {
    const second = provider(SearchProviderKind.SERPAPI, {}, { id: 'p-serp-2', name: 'Second' });

    const result = narrowToExpansionProviders(selection([SERP, second, OLLAMA]), {
      providerId: SERP.id,
    });

    expect(names(result)).toEqual(['P-SERPAPI', 'P-OLLAMA_WEB']);
  });
});

describe('SearchExecutionService.findGoogleProvider', () => {
  it('is the first enabled SERPAPI provider in rank order; null when there is none', async () => {
    const second = provider(SearchProviderKind.SERPAPI, {}, { id: 'p-serp-2' });

    expect((await build([EXA, SERP, second]).service.findGoogleProvider())?.id).toBe(SERP.id);
    expect(await build([EXA, OLLAMA]).service.findGoogleProvider()).toBeNull();
  });

  it('an explicit pick counts only when it IS an enabled, active SERPAPI provider', async () => {
    const off = provider(SearchProviderKind.SERPAPI, {}, { id: 'off', enabled: false });
    const invalid = provider(SearchProviderKind.SERPAPI, {}, { id: 'bad', status: 'INVALID' });
    const { service } = build([EXA, SERP, off, invalid]);

    expect((await service.findGoogleProvider(SERP.id))?.id).toBe(SERP.id);
    expect(await service.findGoogleProvider(EXA.id)).toBeNull();
    expect(await service.findGoogleProvider('off')).toBeNull();
    expect(await service.findGoogleProvider('bad')).toBeNull();
    expect(await service.findGoogleProvider('missing')).toBeNull();
  });
});

describe('SearchExecutionService: a query routed to Google (ADR-228)', () => {
  it('an expansion query goes to the expansion providers AND Google, never to another paid provider', async () => {
    const built = build([EXA, SERP, OLLAMA]);

    const answer = await built.service.executeExpansion('u1', { query: 'gpai' }, false, {
      providerId: SERP.id,
    });

    expect(built.kindsCalled()).toEqual(['OLLAMA_WEB', 'SERPAPI']);
    expect(answer?.attemptedProviders.sort()).toEqual(['P-OLLAMA_WEB', 'P-SERPAPI']);
    expect(built.recordUsage).toHaveBeenCalledTimes(2);
  });

  it('with no expansion provider, Google alone answers a routed query; unrouted it is skipped (as before)', async () => {
    const routed = build([EXA, SERP]);
    const unrouted = build([EXA, SERP]);

    await routed.service.executeExpansion('u1', { query: 'gpai' }, false, { providerId: SERP.id });
    const skipped = await unrouted.service.executeExpansion('u1', { query: 'gpai' }, false);

    expect(routed.kindsCalled()).toEqual(['SERPAPI']);
    expect(skipped).toBeNull();
    expect(unrouted.kindsCalled()).toEqual([]);
  });

  it('a query routed to no Google never reaches SERPAPI, even one flagged expansion: true', async () => {
    const built = build([provider(SearchProviderKind.SERPAPI, { expansion: true }), OLLAMA]);

    await built.service.executeExpansion('u1', { query: 'gpai' }, false, { providerId: null });

    expect(built.kindsCalled()).toEqual(['OLLAMA_WEB']);
  });

  it('an open Google breaker skips Google beside other providers (an outcome, no call)', async () => {
    const built = build([SERP, OLLAMA]);
    tripBreaker(built.health, SERP.id);

    const answer = await built.service.executeExpansion('u1', { query: 'gpai' }, false, {
      providerId: SERP.id,
    });

    expect(built.kindsCalled()).toEqual(['OLLAMA_WEB']);
    expect(answer?.providers.find((outcome) => outcome.kind === 'SERPAPI')?.status).toBe('SKIPPED');
  });

  it('an open Google breaker with nothing else to ask: no call at all, never the "try everyone" guard', async () => {
    const built = build([EXA, SERP]);
    tripBreaker(built.health, SERP.id);

    const answer = await built.service.executeExpansion('u1', { query: 'gpai' }, false, {
      providerId: SERP.id,
    });

    expect(answer).toBeNull();
    expect(built.kindsCalled()).toEqual([]);
    expect(built.recordUsage).not.toHaveBeenCalled();
  });

  it('the primary with Google left out (a budget of 0) skips SERPAPI in AUTO; all providers otherwise', async () => {
    const left = build([EXA, SERP, OLLAMA]);
    const kept = build([EXA, SERP, OLLAMA]);

    await left.service.executeCached('u1', { query: 'q' }, false, { providerId: null });
    await kept.service.executeCached('u1', { query: 'q' }, false, { providerId: SERP.id });

    expect(left.kindsCalled()).toEqual(['EXA', 'OLLAMA_WEB']);
    expect(kept.kindsCalled()).toEqual(['EXA', 'OLLAMA_WEB', 'SERPAPI']);
  });

  it('an explicit pick of the Google provider still runs its primary, whatever the route says', async () => {
    const built = build([EXA, SERP]);

    await built.service.executeCached('u1', { query: 'q', providerId: SERP.id }, false, {
      providerId: null,
    });

    expect(built.kindsCalled()).toEqual(['SERPAPI']);
  });

  it('no provider left once Google is left out is NO_ENABLED_PROVIDER, not an empty answer', async () => {
    const built = build([SERP]);

    await expect(
      built.service.executeCached('u1', { query: 'q' }, false, { providerId: null }),
    ).rejects.toMatchObject({ code: ResearchErrorCode.NO_ENABLED_PROVIDER });
    expect(built.kindsCalled()).toEqual([]);
  });
});

describe('SearchExecutionService.executeGooglePage (ADR-228)', () => {
  const page = (start: number, extra: Record<string, unknown> = {}) => ({
    query: 'eu ai act',
    start,
    ...extra,
  });

  it('calls only the Google provider, with SerpApi start and a full page of 10 results', async () => {
    const built = build([EXA, SERP, OLLAMA]);

    const answer = await built.service.executeGooglePage('u1', page(20), SERP.id, false);

    expect(built.calls).toHaveLength(1);
    expect(built.calls[0]?.kind).toBe('SERPAPI');
    expect(built.calls[0]?.request).toMatchObject({
      query: 'eu ai act',
      start: 20,
      maxResults: 10,
    });
    expect(answer?.results).toHaveLength(1);
  });

  it('passes the query language on as filters.language (SerpApi turns it into hl)', async () => {
    const built = build([SERP]);

    await built.service.executeGooglePage(
      'u1',
      page(10, { filters: { language: 'de' } }),
      SERP.id,
      false,
    );

    expect(built.calls[0]?.request.filters).toMatchObject({ language: 'de' });
  });

  it('records one WEB_SEARCH unit per real call, none for a cache hit', async () => {
    const built = build([SERP]);
    await built.service.executeGooglePage('u1', page(10), SERP.id, false);
    await built.service.executeGooglePage('u1', page(20), SERP.id, false);
    expect(built.recordUsage).toHaveBeenCalledTimes(2);

    const cachedRun = build([SERP], { cached: { results: [], providers: [], cached: true } });
    const answer = await cachedRun.service.executeGooglePage('u1', page(10), SERP.id, true);
    expect(answer?.cached).toBe(true);
    expect(cachedRun.calls).toHaveLength(0);
    expect(cachedRun.recordUsage).not.toHaveBeenCalled();
  });

  it('is cached under a key that holds the page and the language, so pages never collide', async () => {
    const built = build([SERP]);

    await built.service.executeGooglePage(
      'u1',
      page(30, { filters: { language: 'ar' } }),
      SERP.id,
      true,
    );

    const expected = searchCacheKey('eu ai act', [SERP.id], 10, 'ar', 30);
    expect(built.cache.read).toHaveBeenCalledWith(expected);
    await vi.waitFor(() =>
      expect(built.cache.write).toHaveBeenCalledWith(expected, expect.anything()),
    );
    expect(expected).not.toBe(searchCacheKey('eu ai act', [SERP.id], 10, 'ar', 40));
  });

  it('an open Google breaker skips the page: null, no SearchRun, no call, no unit', async () => {
    const built = build([EXA, SERP]);
    tripBreaker(built.health, SERP.id);

    const answer = await built.service.executeGooglePage('u1', page(10), SERP.id, false);

    expect(answer).toBeNull();
    expect(built.calls).toHaveLength(0);
    expect(built.recordUsage).not.toHaveBeenCalled();
  });

  it('a failed page rejects (the caller reports it, the run goes on) and counts against the breaker', async () => {
    const built = build([SERP], { failKinds: ['SERPAPI'] });

    await expect(
      built.service.executeGooglePage('u1', page(10), SERP.id, false),
    ).rejects.toBeInstanceOf(BusinessException);
    await expect(built.service.executeGooglePage('u1', page(20), SERP.id, false)).rejects.toThrow();
    await expect(built.service.executeGooglePage('u1', page(30), SERP.id, false)).rejects.toThrow();

    expect(built.health.isOpen(SERP.id)).toBe(true);
  });

  it('an unknown or disabled provider id is no page: null', async () => {
    const built = build([EXA, OLLAMA]);

    expect(await built.service.executeGooglePage('u1', page(10), 'p-SERPAPI', false)).toBeNull();
    expect(built.calls).toHaveLength(0);
  });

  it('a first-page request without start sends none (page 1 is the primary call)', async () => {
    const built = build([SERP]);

    await built.service.executeCached('u1', { query: 'q' }, false, { providerId: SERP.id });

    expect(built.calls[0]?.request).not.toHaveProperty('start');
  });
});
