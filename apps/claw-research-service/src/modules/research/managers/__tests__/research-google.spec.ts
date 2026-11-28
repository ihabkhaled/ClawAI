import { describe, expect, it, vi } from 'vitest';

import {
  GOOGLE_MAX_PAGES_CONFIG_KEY,
  GOOGLE_MAX_QUERIES_CONFIG_KEY,
} from '../../../../common/constants/research-engine.constants';
import { ResearchRunStatus } from '../../../../common/enums/research-run-status.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearchExecutionService } from '../../../search/services/search-execution.service';
import { SearchProviderHealthService } from '../../../search/services/search-provider-health.service';
import { ResearchEvidenceStoreService } from '../../services/research-evidence-store.service';
import { canonicalUrlKey } from '../../utilities/fetch-targets.utility';
import { MultiQuerySearchManager } from '../multi-query-search.manager';
import { ResearchManager } from '../research.manager';
import type { SearchAdapterContext, SearchRequest } from '../../../search/types/search.types';
import type { ExecuteResearchDto } from '../../dto/execute-research.dto';
import type { EvidenceBundle } from '../../types/evidence-bundle.types';

const row = (kind: SearchProviderKind, publicConfig: Record<string, unknown> = {}) => ({
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
});

type Call = { kind: string; request: SearchRequest };
type Options = {
  /** A call to fail, by the fake adapter. */
  fail?: (call: Call) => boolean;
  /** A call the provider answers with no results (a page past the end). */
  empty?: (call: Call) => boolean;
  /** A shared in-memory Redis stand-in; absent = no cache hits. */
  cache?: Map<string, unknown>;
  tripGoogleBreaker?: boolean;
};

const ARABIC = 'قانون الذكاء';
const slug = (text: string): string => text.replaceAll(/\s+/gu, '-').toLowerCase();

const harness = (rows: Array<ReturnType<typeof row>>, options: Options = {}) => {
  const calls: Call[] = [];
  const returned: string[] = [];
  const recordUsage = vi.fn(async () => {});
  const adapterFor = (kind: string) => ({
    search: vi.fn(async (request: SearchRequest, context: SearchAdapterContext) => {
      const call = { kind, request };
      calls.push(call);
      await context.onNetworkCall?.();
      if (options.fail?.(call) === true) {
        throw new Error('SerpApi search failed: HTTP 429');
      }
      const base = `https://${kind.toLowerCase()}.example/${slug(request.query)}`;
      if (options.empty?.(call) === true) {
        return { results: [], latencyMs: 1 };
      }
      const urls = [0, 1, 2].map((i) => `${base}/p${String(request.start ?? 0)}/${String(i)}`);
      urls.push('https://shared.example/doc');
      returned.push(...urls);
      return {
        results: urls.map((url) => ({
          id: url,
          title: url,
          url,
          snippet: null,
          publishedAt: null,
          freshness: null,
          score: 1,
          providerKind: kind as SearchProviderKind,
        })),
        latencyMs: 1,
      };
    }),
  });
  const adapters = new Map<string, ReturnType<typeof adapterFor>>();
  const store = options.cache;
  const cache = {
    read: vi.fn(async (key: string) => {
      const found = store?.get(key);
      return found === undefined
        ? null
        : { ...(found as object), cached: true, searchRequestCount: 0 };
    }),
    write: vi.fn(async (key: string, value: unknown) => {
      store?.set(key, value);
    }),
  };
  const health = new SearchProviderHealthService();
  if (options.tripGoogleBreaker === true) {
    for (let i = 0; i < 3; i += 1) {
      health.recordFailure(`p-${SearchProviderKind.SERPAPI}`);
    }
  }
  const searchService = new SearchExecutionService(
    {
      findEnabled: vi.fn(async () => rows),
      findById: vi.fn(async (id: string) => rows.find((entry) => entry.id === id) ?? null),
    } as never,
    {
      create: vi.fn(async () => ({ id: 'search-run', userId: 'u1', providerId: rows[0]?.id })),
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
        const adapter = adapters.get(kind) ?? adapterFor(kind);
        adapters.set(kind, adapter);
        return adapter;
      }),
    } as never,
    { record: recordUsage } as never,
    health,
    cache as never,
  );
  const runs = {
    create: vi.fn(async () => ({ id: 'run-1' })),
    update: vi.fn(async (id: string, data: object) => ({ id, ...data })),
  };
  const sources = { createMany: vi.fn(async () => 0), findRecentByThread: vi.fn(async () => []) };
  const manager = new ResearchManager(
    runs as never,
    searchService,
    { fetchPage: vi.fn() } as never,
    { extract: vi.fn() } as never,
    { record: vi.fn(async () => {}) } as never,
    { crawl: vi.fn(async () => []) } as never,
    { analyze: vi.fn(() => []) } as never,
    new MultiQuerySearchManager(searchService, {} as never),
    new ResearchEvidenceStoreService(sources as never),
  );
  const log = vi.spyOn(
    (manager as unknown as { logger: { log: (message: string) => void } }).logger,
    'log',
  );
  return { manager, calls, returned, recordUsage, cache, log, runs, health };
};

const ALL_PAID = [
  row(SearchProviderKind.EXA),
  row(SearchProviderKind.TAVILY),
  row(SearchProviderKind.SERPAPI),
  row(SearchProviderKind.OLLAMA_WEB),
];

const dto = (extra: Partial<ExecuteResearchDto> = {}): ExecuteResearchDto => ({
  intent: 'eu ai act fines',
  workflow: ResearchWorkflowKind.SEARCH_ONLY,
  threadId: 't1',
  maxResults: 25,
  ...extra,
});

const EXTRAS = [
  'gpai rules',
  'ai act penalties',
  'high risk list',
  ARABIC,
  'sandbox rules',
  'last one',
];

type Built = ReturnType<typeof harness>;
const kindCalls = (built: Built, kind: SearchProviderKind): Call[] =>
  built.calls.filter((call) => call.kind === kind);
const bundleOf = (built: Built): EvidenceBundle =>
  (built.runs.update.mock.calls.at(-1)?.[1] as { bundle: EvidenceBundle }).bundle;

describe('Google in every research run: round 1 (ADR-228)', () => {
  it('depth 5: the primary, the 5 best expansions (other scripts first) and 4 extra primary pages', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 5, round: 1, queries: EXTRAS }));

    const google = kindCalls(built, SearchProviderKind.SERPAPI);
    expect(google).toHaveLength(10);
    const queries = google
      .filter((call) => call.request.start === undefined)
      .map((c) => c.request.query);
    expect(queries).toHaveLength(6);
    expect(queries).toContain('eu ai act fines');
    expect(queries).toContain(ARABIC);
    expect(queries).not.toContain('last one');
    const pages = google.filter((call) => call.request.start !== undefined);
    expect(pages.map((call) => call.request.start).sort((a, b) => Number(a) - Number(b))).toEqual([
      10, 20, 30, 40,
    ]);
    expect(pages.every((call) => call.request.query === 'eu ai act fines')).toBe(true);
    expect(pages.every((call) => call.request.maxResults === 10)).toBe(true);
  });

  it('every real Google call is one WEB_SEARCH unit', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 5, round: 1, queries: EXTRAS }));

    // 10 Google + 1 EXA + 1 TAVILY + 7 OLLAMA_WEB (primary + 6 expansions).
    expect(built.calls).toHaveLength(19);
    expect(built.recordUsage).toHaveBeenCalledTimes(19);
  });

  it('other paid providers are unchanged: the primary once, never an expansion, never a page', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 5, round: 1, queries: EXTRAS }));

    for (const kind of [SearchProviderKind.EXA, SearchProviderKind.TAVILY]) {
      const calls = kindCalls(built, kind);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.request.query).toBe('eu ai act fines');
      expect(calls[0]?.request.start).toBeUndefined();
    }
    expect(kindCalls(built, SearchProviderKind.OLLAMA_WEB)).toHaveLength(7);
  });

  it('depth 3: the primary, 2 expansions and 1 extra page (4 Google calls)', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 3, round: 1, queries: EXTRAS }));

    const google = kindCalls(built, SearchProviderKind.SERPAPI);
    expect(google).toHaveLength(4);
    expect(google.filter((call) => call.request.start === 10)).toHaveLength(1);
  });

  it('no depth: the primary only, one page, exactly as before', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ queries: EXTRAS }));

    expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(1);
    expect(built.calls).toHaveLength(4);
  });

  it('passes the query language on to every Google call, pages included', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 3, queries: EXTRAS, filters: { language: 'de' } }));

    const google = kindCalls(built, SearchProviderKind.SERPAPI);
    expect(google.length).toBeGreaterThan(1);
    expect(google.every((call) => call.request.filters?.['language'] === 'de')).toBe(true);
  });

  it('the fused pool holds every distinct Google page result once', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));

    const distinct = new Set(built.returned.map((url) => canonicalUrlKey(url)));
    expect(bundleOf(built).stats?.resultsFound).toBe(distinct.size);
  });
});

describe('Google in every research run: follow-up rounds (ADR-228)', () => {
  it('round >= 2 at any depth: Google gets the round primary, one call; no expansion, no page', async () => {
    for (const round of [2, 3]) {
      const built = harness(ALL_PAID);

      await built.manager.run(
        'u1',
        dto({ depth: 5, round, searchQuery: 'follow up query', queries: ['another', ARABIC] }),
      );

      const google = kindCalls(built, SearchProviderKind.SERPAPI);
      expect(google).toHaveLength(1);
      expect(google[0]?.request.query).toBe('follow up query');
      expect(google[0]?.request.start).toBeUndefined();
    }
  });

  it('round >= 2 keeps the cost rule for every other paid provider: they are not asked at all', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run(
      'u1',
      dto({ depth: 3, round: 2, searchQuery: 'follow up query', queries: ['another'] }),
    );

    expect(kindCalls(built, SearchProviderKind.EXA)).toHaveLength(0);
    expect(kindCalls(built, SearchProviderKind.TAVILY)).toHaveLength(0);
    // The expansion provider answers the primary and the one extra query.
    expect(kindCalls(built, SearchProviderKind.OLLAMA_WEB)).toHaveLength(2);
    expect(bundleOf(built).stats?.queries).toEqual(['follow up query', 'another']);
  });

  it('round 2 with Google as the only expansion-capable provider: Google answers it (no skipped warning)', async () => {
    const built = harness([row(SearchProviderKind.EXA), row(SearchProviderKind.SERPAPI)]);

    await built.manager.run('u1', dto({ depth: 3, round: 2, searchQuery: 'follow up query' }));

    expect(built.calls.map((call) => call.kind)).toEqual(['SERPAPI']);
    expect(bundleOf(built).warnings.join(' ')).not.toContain('skipped in this follow-up round');
    expect(bundleOf(built).stats?.queriesRun).toBe(1);
  });
});

describe('Google in every research run: the admin override and the breaker', () => {
  const withOverride = (config: Record<string, unknown>) => [
    row(SearchProviderKind.EXA),
    row(SearchProviderKind.SERPAPI, config),
    row(SearchProviderKind.OLLAMA_WEB),
  ];

  it('googleMaxQueriesPerRun 0 takes Google out of research runs; the others still run', async () => {
    for (const round of [1, 2]) {
      const built = harness(withOverride({ [GOOGLE_MAX_QUERIES_CONFIG_KEY]: 0 }));

      await built.manager.run('u1', dto({ depth: 5, round, queries: EXTRAS }));

      expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(0);
      expect(built.calls.length).toBeGreaterThan(0);
    }
  });

  it('from depth 3 the override replaces the default: 5 queries and 4 pages at depth 3', async () => {
    const built = harness(
      withOverride({ [GOOGLE_MAX_QUERIES_CONFIG_KEY]: 5, [GOOGLE_MAX_PAGES_CONFIG_KEY]: 4 }),
    );

    await built.manager.run('u1', dto({ depth: 3, queries: EXTRAS }));

    // depth 3 allows 5 extra queries: the primary + 4 expansions + 3 extra pages = 8.
    expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(8);
  });

  it('below depth 3 the override only caps: it never makes a shallow run dearer', async () => {
    const built = harness(
      withOverride({ [GOOGLE_MAX_QUERIES_CONFIG_KEY]: 20, [GOOGLE_MAX_PAGES_CONFIG_KEY]: 10 }),
    );

    await built.manager.run('u1', dto({ depth: 2, queries: EXTRAS }));

    // depth 2 default: 2 queries, 1 page.
    expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(2);
  });

  it('an invalid override is ignored: the depth default applies', async () => {
    const built = harness(
      withOverride({ [GOOGLE_MAX_QUERIES_CONFIG_KEY]: 99, [GOOGLE_MAX_PAGES_CONFIG_KEY]: 'x' }),
    );

    await built.manager.run('u1', dto({ depth: 3, queries: EXTRAS }));

    expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(4);
  });

  it('an open Google breaker skips Google everywhere: no call, no page, the run still answers', async () => {
    const built = harness(ALL_PAID, { tripGoogleBreaker: true });

    const run = await built.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));

    expect(run).toMatchObject({ status: ResearchRunStatus.COMPLETED });
    expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(0);
    expect(kindCalls(built, SearchProviderKind.EXA)).toHaveLength(1);
  });
});

describe('Google in every research run: pages never fail the run', () => {
  it('a failed page is one warning; the other pages and the whole run are kept', async () => {
    const built = harness(ALL_PAID, {
      fail: (call) => call.kind === 'SERPAPI' && call.request.start === 20,
    });

    const run = await built.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));

    expect(run).toMatchObject({ status: ResearchRunStatus.COMPLETED });
    const warnings = bundleOf(built).warnings.filter((warning) => warning.includes('Google'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('page 3');
    expect(warnings[0]).not.toContain('eu ai act');
    expect(bundleOf(built).stats?.resultsFound).toBeGreaterThan(0);
  });

  it('every page failing still completes the run on the primary and the other providers', async () => {
    const built = harness(ALL_PAID, {
      fail: (call) => call.kind === 'SERPAPI' && call.request.start !== undefined,
    });

    const run = await built.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));

    expect(run).toMatchObject({ status: ResearchRunStatus.COMPLETED });
    expect(bundleOf(built).warnings.filter((warning) => warning.includes('Google'))).toHaveLength(
      4,
    );
  });

  it('an empty page (past the last result) is no warning and no failure', async () => {
    const built = harness(ALL_PAID, {
      empty: (call) => call.kind === 'SERPAPI' && call.request.start !== undefined,
    });

    const run = await built.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));

    expect(run).toMatchObject({ status: ResearchRunStatus.COMPLETED });
    expect(bundleOf(built).warnings.filter((warning) => warning.includes('Google'))).toHaveLength(
      0,
    );
  });
});

describe('Google in every research run: cache keys and the log line', () => {
  it('each page and query has its own cache entry; a repeat run makes no Google call and no unit', async () => {
    const store = new Map<string, unknown>();
    const first = harness(ALL_PAID, { cache: store });
    await first.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));
    // 1 primary + 6 expansions + 4 pages: eleven executions, eleven distinct keys.
    await vi.waitFor(() => expect(store.size).toBe(11));

    const second = harness(ALL_PAID, { cache: store });
    await second.manager.run('u1', dto({ depth: 5, queries: EXTRAS }));

    expect(second.calls).toHaveLength(0);
    expect(second.recordUsage).not.toHaveBeenCalled();
    expect(bundleOf(second).stats?.cachedSearches).toBe(7);
  });

  it('logs one google: line per run: counts only, never a query', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', dto({ depth: 3, round: 1, queries: EXTRAS }));

    const lines = built.log.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.startsWith('google:'));
    expect(lines).toEqual(['google: queries=3 pages=4 results=16 depth=3 round=1']);
  });

  it('logs depth=none for a request with no depth, and zeros when Google is not enabled', async () => {
    const withGoogle = harness(ALL_PAID);
    await withGoogle.manager.run('u1', dto({ queries: EXTRAS }));
    const without = harness([row(SearchProviderKind.EXA), row(SearchProviderKind.OLLAMA_WEB)]);
    await without.manager.run('u1', dto({ depth: 4, round: 2, searchQuery: 'follow up' }));

    const lineOf = (built: Built): string =>
      built.log.mock.calls.map((call) => String(call[0])).find((l) => l.startsWith('google:')) ??
      '';
    expect(lineOf(withGoogle)).toBe('google: queries=1 pages=1 results=4 depth=none round=1');
    expect(lineOf(without)).toBe('google: queries=0 pages=0 results=0 depth=4 round=2');
  });
});

describe('Google in every research run: an old-shape request is unchanged', () => {
  it('one execute(): Google sees the prompt once, page 1, and the run logs its google: line', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run('u1', {
      intent: 'eu ai act fines',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
    });

    expect(built.calls.map((call) => call.kind).sort()).toEqual([
      'EXA',
      'OLLAMA_WEB',
      'SERPAPI',
      'TAVILY',
    ]);
    expect(built.calls.every((call) => call.request.start === undefined)).toBe(true);
    const line = built.log.mock.calls
      .map((call) => String(call[0]))
      .find((l) => l.startsWith('google:'));
    expect(line).toBe('google: queries=1 pages=1 results=4 depth=none round=1');
  });

  it('an explicit non-Google provider pick is the only source: Google is not added', async () => {
    const built = harness(ALL_PAID);

    await built.manager.run(
      'u1',
      dto({ depth: 5, queries: EXTRAS, searchProviderId: `p-${SearchProviderKind.EXA}` }),
    );

    expect(kindCalls(built, SearchProviderKind.SERPAPI)).toHaveLength(0);
  });
});
