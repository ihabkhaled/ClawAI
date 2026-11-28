import { describe, expect, it, type Mock, vi } from 'vitest';

import { HttpStatus } from '@nestjs/common';
import { NO_GOOGLE_ROUTE } from '../../../../common/constants/research-engine.constants';
import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { ResearchRunStatus } from '../../../../common/enums/research-run-status.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchExecutionMode } from '../../../../common/enums/search-execution-mode.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearchProviderRunStatus } from '../../../../common/enums/search-provider-run-status.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { contentHashOf } from '../../../../common/utilities/content-hash.utility';
import { ResearchEvidenceStoreService } from '../../services/research-evidence-store.service';
import { ResearchRunState } from '../../utilities/research-run-state.utility';
import { MultiQuerySearchManager } from '../multi-query-search.manager';
import { ResearchManager } from '../research.manager';
import type { ResearchSource } from '../../../../generated/prisma';
import type { SearchExecutionService } from '../../../search/services/search-execution.service';
import type { SearchExecutionResult } from '../../../search/types/search-execution-result.types';
import type { SearchResult } from '../../../search/types/search.types';
import type { ExecuteResearchDto } from '../../dto/execute-research.dto';
import type { EvidenceBundle } from '../../types/evidence-bundle.types';

/** B2 runs never read the platform registry: any call here fails the test. */
const noPlatforms = new Proxy(
  {},
  {
    get: (_target, key) => {
      throw new Error(`platform registry touched on a B2 run: ${String(key)}`);
    },
  },
) as never;

const hit = (url: string): SearchResult => ({
  id: url,
  title: `T ${url}`,
  url,
  snippet: `snippet of ${url}`,
  publishedAt: null,
  freshness: null,
  score: 0.9,
  providerKind: SearchProviderKind.OLLAMA_WEB,
});

const answer = (
  urls: string[],
  overrides: Partial<SearchExecutionResult> = {},
): SearchExecutionResult => ({
  runId: 'search-run',
  providerId: 'p1',
  providerName: 'Ollama Web',
  providerKind: SearchProviderKind.OLLAMA_WEB,
  selectionMode: ProviderSelectionMode.AUTO,
  mode: SearchExecutionMode.AUTO_ALL,
  providers: [
    {
      name: 'Ollama Web',
      kind: 'OLLAMA_WEB',
      status: SearchProviderRunStatus.OK,
      latencyMs: 1,
      resultCount: urls.length,
      errorCode: null,
    },
    {
      name: 'SerpApi',
      kind: 'SERPAPI',
      status: SearchProviderRunStatus.FAILED,
      latencyMs: 1,
      resultCount: 0,
      errorCode: null,
    },
  ],
  fallbackUsed: false,
  attemptedProviders: ['Ollama Web', 'SerpApi'],
  searchRequestCount: 2,
  query: 'q',
  results: urls.map((url) => hit(url)),
  latencyMs: 1,
  ...overrides,
});

const storedRow = (overrides: Partial<ResearchSource> = {}): ResearchSource => ({
  id: 's1',
  runId: 'run-earlier',
  userId: 'u1',
  threadId: 'thread-1',
  url: 'https://memo.example/read',
  canonicalKey: 'memo.example/read',
  host: 'memo.example',
  title: 'Read before',
  excerpt: 'what the page said an hour ago',
  contentHash: 'h',
  language: null,
  query: null,
  round: 1,
  discoveredVia: 'SEARCH',
  providerKind: null,
  fetchStatus: 'OK',
  publishedAt: null,
  retrievedAt: new Date(Date.now() - 60 * 60 * 1000),
  score: 0.8,
  createdAt: new Date(Date.now() - 60 * 60 * 1000),
  ...overrides,
});

type Harness = {
  manager: ResearchManager;
  search: { execute: Mock; executeCached: Mock; executeExpansion: Mock; findGoogleProvider: Mock };
  fetchPage: Mock;
  runs: { create: Mock; update: Mock };
  sources: { createMany: Mock; findRecentByThread: Mock };
};

const harness = (): Harness => {
  const runs = {
    create: vi.fn(async () => ({ id: 'run-1' })),
    update: vi.fn(async (id: string, data: object) => ({ id, ...data })),
  };
  const search = {
    findGoogleProvider: vi.fn(async () => null),
    execute: vi.fn(async () => answer(['https://a.example/1'])),
    executeCached: vi.fn(async () => answer(['https://a.example/1', 'https://b.example/2'])),
    executeExpansion: vi.fn(async (_u: string, dto: { query: string }) =>
      answer([`https://x.example/${dto.query.replaceAll(' ', '-')}`, 'https://b.example/2']),
    ),
  };
  const fetchPage = vi.fn(async (_u: string, dto: { url: string }) => ({
    url: dto.url,
    finalUrl: dto.url,
    httpStatus: 200,
    mimeType: 'text/html',
    title: `Page ${dto.url}`,
    content: `Distinct body for ${dto.url}`,
    links: [],
    byteSize: 100,
    cacheHit: false,
    latencyMs: 1,
  }));
  const sources = {
    createMany: vi.fn(async (rows: unknown[]) => rows.length),
    findRecentByThread: vi.fn(async (): Promise<ResearchSource[]> => []),
  };
  const searchService = search as unknown as SearchExecutionService;
  const manager = new ResearchManager(
    runs as never,
    searchService,
    { fetchPage } as never,
    { extract: vi.fn() } as never,
    { record: vi.fn(async () => {}) } as never,
    { crawl: vi.fn(async () => []) } as never,
    { analyze: vi.fn(() => []) } as never,
    new MultiQuerySearchManager(searchService, noPlatforms),
    new ResearchEvidenceStoreService(sources as never),
  );
  return { manager, search, fetchPage, runs, sources };
};

const bundleOf = (h: Harness): EvidenceBundle =>
  (h.runs.update.mock.calls.at(-1)?.[1] as { bundle: EvidenceBundle }).bundle;

const engineDto = (extra: Partial<ExecuteResearchDto> = {}): ExecuteResearchDto => ({
  intent: 'eu ai act fines',
  workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
  threadId: 'thread-1',
  ...extra,
});

describe('ResearchManager — old-shape request (no engine field)', () => {
  it('runs exactly today: one execute(), no cache path, no stats, no engine item fields', async () => {
    const h = harness();

    await h.manager.run('u1', {
      intent: 'eu ai act fines',
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
    });

    expect(h.search.execute).toHaveBeenCalledTimes(1);
    expect(h.search.execute).toHaveBeenCalledWith('u1', {
      providerId: undefined,
      query: 'eu ai act fines',
      maxResults: undefined,
      filters: {
        researchWorkflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
        researchMode: undefined,
      },
    });
    expect(h.search.executeCached).not.toHaveBeenCalled();
    expect(h.search.executeExpansion).not.toHaveBeenCalled();
    expect(h.sources.findRecentByThread).not.toHaveBeenCalled();
    const bundle = bundleOf(h);
    expect(bundle).not.toHaveProperty('stats');
    for (const item of bundle.items) {
      for (const key of ['query', 'round', 'contentHash', 'reusedFromRunId']) {
        expect(item).not.toHaveProperty(key);
      }
    }
    expect(h.runs.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ threadId: expect.anything() }),
    );
  });

  it('is still written to the evidence store, with no thread', async () => {
    const h = harness();

    await h.manager.run('u1', {
      intent: 'eu ai act',
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
    });

    await vi.waitFor(() => expect(h.sources.createMany).toHaveBeenCalledTimes(1));
    const rows = h.sources.createMany.mock.calls[0]?.[0] as Array<{ threadId: string | null }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.threadId === null)).toBe(true);
  });
});

describe('ResearchManager — engine run (B1+B2)', () => {
  it('stores threadId on the run, echoes round and reports stats', async () => {
    const h = harness();

    await h.manager.run(
      'u1',
      engineDto({ round: 2, depth: 2, languages: ['de'], queries: ['gpai obligations'] }),
    );

    expect(h.runs.create).toHaveBeenCalledWith(expect.objectContaining({ threadId: 'thread-1' }));
    const bundle = bundleOf(h);
    expect(bundle.stats).toEqual({
      round: 2,
      queriesRun: 2,
      queries: ['eu ai act fines', 'gpai obligations'],
      languages: ['de'],
      providersUsed: ['Ollama Web'],
      resultsFound: 3,
      pagesRead: 3,
      duplicatesRemoved: 0,
      reusedFromThread: 0,
      cachedSearches: 0,
    });
    for (const item of bundle.items) {
      expect(item.round).toBe(2);
      expect(item.contentHash).toMatch(/^[0-9a-f]{64}$/u);
    }
    const viaExpansion = bundle.items.find((item) => item.url.includes('gpai-obligations'));
    expect(viaExpansion?.query).toBe('gpai obligations');
  });

  it('runs expansion queries in parallel with the primary, capped by the depth budget', async () => {
    const h = harness();

    await h.manager.run('u1', engineDto({ depth: 1, queries: ['a one', 'b two', 'c three'] }));

    expect(h.search.executeCached).toHaveBeenCalledTimes(1);
    expect(h.search.executeExpansion).toHaveBeenCalledTimes(1);
    expect(h.search.executeExpansion).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ query: 'a one' }),
      true,
      NO_GOOGLE_ROUTE,
    );
  });

  it('depth absent: extra queries are not run (today budget)', async () => {
    const h = harness();

    await h.manager.run('u1', engineDto({ queries: ['a one'] }));

    expect(h.search.executeExpansion).not.toHaveBeenCalled();
    expect(bundleOf(h).stats?.queriesRun).toBe(1);
  });

  it('fetches the depth budget of pages (depth 1 = 8, never fewer than today), max 2 per host', async () => {
    const h = harness();
    const urls = Array.from(
      { length: 12 },
      (_, i) => `https://h${String(i % 6)}.example/${String(i)}`,
    );
    h.search.executeCached.mockResolvedValueOnce(answer(urls));

    await h.manager.run('u1', engineDto({ depth: 1 }));

    expect(h.fetchPage).toHaveBeenCalledTimes(8);
    const hosts = h.fetchPage.mock.calls.map(
      (call) => new URL((call[1] as { url: string }).url).host,
    );
    for (const host of new Set(hosts)) {
      expect(hosts.filter((h2) => h2 === host).length).toBeLessThanOrEqual(2);
    }
  });

  it('excludeUrls: never fetched again, search hits dropped, pasted links skipped', async () => {
    const h = harness();

    await h.manager.run(
      'u1',
      engineDto({
        intent: 'compare https://pasted.example/doc with eu ai act fines',
        excludeUrls: ['https://b.example/2', 'https://pasted.example/doc'],
      }),
    );

    const fetched = h.fetchPage.mock.calls.map((call) => (call[1] as { url: string }).url);
    expect(fetched).toEqual(['https://a.example/1']);
    expect(bundleOf(h).items.map((item) => item.url)).not.toContain('https://b.example/2');
  });

  it('content-hash dedupe drops a syndicated copy and counts it', async () => {
    const h = harness();
    h.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => ({
      url: dto.url,
      finalUrl: dto.url,
      httpStatus: 200,
      title: 'Same',
      content: dto.url.includes('a.example') ? 'The  Same Article' : 'the same   article',
      links: [],
      byteSize: 10,
      cacheHit: false,
      latencyMs: 1,
    }));

    await h.manager.run('u1', engineDto());

    const bundle = bundleOf(h);
    const pages = bundle.items.filter((item) => item.source === 'fetch');
    expect(pages.map((page) => page.url)).toEqual(['https://a.example/1']);
    expect(pages[0]?.contentHash).toBe(contentHashOf('the same article'));
    expect(bundle.stats?.duplicatesRemoved).toBe(1);
    expect(bundle.stats?.pagesRead).toBe(1);
  });

  it('thread memory (a): a page read in this thread is served from the store, not fetched', async () => {
    const h = harness();
    h.search.executeCached.mockResolvedValueOnce(
      answer(['https://memo.example/read', 'https://a.example/1']),
    );
    h.sources.findRecentByThread.mockResolvedValueOnce([storedRow()]);

    await h.manager.run('u1', engineDto());

    expect(h.sources.findRecentByThread).toHaveBeenCalledWith(
      'u1',
      'thread-1',
      expect.any(Date),
      50,
    );
    const fetched = h.fetchPage.mock.calls.map((call) => (call[1] as { url: string }).url);
    expect(fetched).toEqual(['https://a.example/1']);
    const reused = bundleOf(h).items.find((item) => item.reusedFromRunId !== undefined);
    expect(reused).toMatchObject({
      url: 'https://memo.example/read',
      snippet: 'what the page said an hour ago',
      reusedFromRunId: 'run-earlier',
      source: 'fetch',
    });
    expect(reused).not.toHaveProperty('fetch');
    expect(bundleOf(h).stats).toMatchObject({ reusedFromThread: 1, pagesRead: 2 });
  });

  it('thread memory (b): adds at most 3 matching earlier sources, none below the overlap bar', async () => {
    const h = harness();
    h.sources.findRecentByThread.mockResolvedValueOnce([
      storedRow({
        url: 'https://m1.example/1',
        canonicalKey: 'm1.example/1',
        title: 'EU AI act fines table',
      }),
      storedRow({
        url: 'https://m2.example/2',
        canonicalKey: 'm2.example/2',
        title: 'AI act fines explained',
      }),
      storedRow({
        url: 'https://m3.example/3',
        canonicalKey: 'm3.example/3',
        title: 'Fines under the act',
      }),
      storedRow({
        url: 'https://m4.example/4',
        canonicalKey: 'm4.example/4',
        title: 'Act fines overview',
      }),
      storedRow({
        url: 'https://m5.example/5',
        canonicalKey: 'm5.example/5',
        title: 'Unrelated fines',
        excerpt: 'parking',
      }),
    ]);

    await h.manager.run('u1', engineDto({ intent: 'eu ai act fines' }));

    const extras = bundleOf(h).items.filter((item) => item.reusedFromRunId !== undefined);
    expect(extras).toHaveLength(3);
    expect(extras.map((item) => item.url)).not.toContain('https://m5.example/5');
    expect(extras.every((item) => item.confidence === 0.5)).toBe(true);
    expect(bundleOf(h).stats?.reusedFromThread).toBe(3);
  });

  it('a cached primary is counted and marked search:cached', async () => {
    const h = harness();
    h.search.executeCached.mockResolvedValueOnce(
      answer(['https://a.example/1'], { cached: true, searchRequestCount: 0 }),
    );

    await h.manager.run('u1', engineDto());

    const bundle = bundleOf(h);
    expect(bundle.stats?.cachedSearches).toBe(1);
    expect(bundle.toolsUsed).toContain('search:cached');
    expect(bundle.toolsUsed).not.toContain('search:ollama_web');
  });

  it('a failing evidence-store write never fails the run', async () => {
    const h = harness();
    h.sources.createMany.mockRejectedValue(new Error('db down'));

    const run = await h.manager.run('u1', engineDto());

    expect(run).toMatchObject({ status: ResearchRunStatus.COMPLETED });
    await vi.waitFor(() => expect(h.sources.createMany).toHaveBeenCalledTimes(1));
  });

  it('a failing thread-memory read is an empty memory, not a failed run', async () => {
    const h = harness();
    h.sources.findRecentByThread.mockRejectedValue(new Error('db down'));

    const run = await h.manager.run('u1', engineDto());

    expect(run).toMatchObject({ status: ResearchRunStatus.COMPLETED });
    expect(bundleOf(h).stats?.reusedFromThread).toBe(0);
  });

  it('persists every bundle item with thread, round and discovery', async () => {
    const h = harness();

    await h.manager.run(
      'u1',
      engineDto({ round: 3, intent: 'read https://pasted.example/doc about eu ai act fines' }),
    );

    await vi.waitFor(() => expect(h.sources.createMany).toHaveBeenCalledTimes(1));
    const rows = h.sources.createMany.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(bundleOf(h).items.length);
    expect(rows.every((row) => row['threadId'] === 'thread-1' && row['round'] === 3)).toBe(true);
    expect(rows.find((row) => row['url'] === 'https://pasted.example/doc')?.['discoveredVia']).toBe(
      'DIRECT',
    );
    // Round 3: the primary ran on expansion providers only (cost rule), whose answer has b.example.
    expect(
      rows.find((row) => row['url'] === 'https://b.example/2' && row['fetchStatus'] === 'OK')?.[
        'discoveredVia'
      ],
    ).toBe('SEARCH');
  });

  it('logs one research.run line with counts only', async () => {
    const h = harness();
    const log = vi.spyOn(
      (h.manager as unknown as { logger: { log: (m: string) => void } }).logger,
      'log',
    );

    await h.manager.run('u1', engineDto({ depth: 2, queries: ['secret topic'] }));

    const lines = log.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.startsWith('research.run:'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(
      /^research\.run: queries=2 cached=0 results=\d+ pages=\d+ dupes=0 reused=0 round=1 depth=2 platforms=0 ms=\d+$/u,
    );
    expect(lines[0]).not.toContain('secret');
    expect(lines[0]).not.toContain('example');
  });

  it('a total primary search failure still fails the run as today', async () => {
    const h = harness();
    h.search.executeCached.mockRejectedValueOnce(
      new BusinessException('x', ResearchErrorCode.SEARCH_FAILED, HttpStatus.BAD_GATEWAY),
    );

    const run = await h.manager.run('u1', engineDto({ depth: 2, queries: ['other'] }));

    expect(run).toMatchObject({ status: ResearchRunStatus.FAILED });
  });
});

describe('MultiQuerySearchManager', () => {
  const run = async (
    search: Partial<Record<'executeCached' | 'executeExpansion', Mock>>,
    dto: ExecuteResearchDto,
  ) => {
    const manager = new MultiQuerySearchManager(
      {
        findGoogleProvider: vi.fn(async () => null),
        ...search,
      } as unknown as SearchExecutionService,
      noPlatforms,
    );
    const state = new ResearchRunState(dto, 0);
    const warnings: string[] = [];
    const trace: Array<{ phase: string; status: string }> = [];
    const toolsUsed: string[] = [];
    const out = await manager.run('u1', dto, state, trace as never, toolsUsed, warnings);
    return { out, state, warnings, trace, toolsUsed, manager };
  };

  it('no expansion provider: expansions skipped with exactly one warning', async () => {
    const { warnings, state } = await run(
      {
        executeCached: vi.fn(async () => answer(['https://a.example/1'])),
        executeExpansion: vi.fn(async () => null),
      },
      engineDto({ depth: 3, queries: ['q one', 'q two', 'q three'] }),
    );

    expect(warnings.filter((w) => w.includes('query expansion'))).toHaveLength(1);
    expect(state.stats([]).queries).toEqual(['eu ai act fines']);
  });

  it('a failed expansion becomes a warning; the rest of the run continues', async () => {
    const { warnings, state, out } = await run(
      {
        executeCached: vi.fn(async () => answer(['https://a.example/1'])),
        executeExpansion: vi
          .fn()
          .mockRejectedValueOnce(
            new BusinessException('x', ResearchErrorCode.SEARCH_FAILED, HttpStatus.BAD_GATEWAY, {
              message: 'all providers failed',
            }),
          )
          .mockResolvedValueOnce(answer(['https://z.example/9'])),
      },
      engineDto({ depth: 2, queries: ['bad', 'good'] }),
    );

    expect(warnings).toContain('An extra search query failed: all providers failed');
    expect(state.stats([]).queries).toEqual(['eu ai act fines', 'good']);
    expect(out.items.map((item) => item.url)).toEqual([
      'https://a.example/1',
      'https://z.example/9',
    ]);
  });

  it('caller filters or an explicit provider turn the cache off', async () => {
    const executeCached = vi.fn(async (_userId: string, _dto: unknown, _useCache: boolean) =>
      answer([]),
    );
    await run(
      { executeCached, executeExpansion: vi.fn() },
      engineDto({ filters: { language: 'de' } }),
    );
    await run({ executeCached, executeExpansion: vi.fn() }, engineDto({ searchProviderId: 'p1' }));
    await run({ executeCached, executeExpansion: vi.fn() }, engineDto());

    expect(executeCached.mock.calls.map((call) => call[2])).toEqual([false, false, true]);
  });

  it('reports providers that answered, never ones that failed', async () => {
    const manager = new MultiQuerySearchManager({} as never, noPlatforms);
    expect(manager.providersThatAnswered([answer([]), answer([], { providers: [] })])).toEqual([
      'Ollama Web',
    ]);
  });

  it('traces the expansion phase', async () => {
    const { trace } = await run(
      {
        executeCached: vi.fn(async () => answer(['https://a.example/1'])),
        executeExpansion: vi.fn(async () => answer(['https://b.example/2'])),
      },
      engineDto({ depth: 1, queries: ['x y'] }),
    );

    expect(trace.map((entry) => `${entry.phase}:${entry.status}`)).toEqual([
      'search:ok',
      'search.expansion:ok',
    ]);
  });

  it('depth that allows no extra queries leaves a skipped trace, not a warning', async () => {
    const { trace, warnings } = await run(
      {
        executeCached: vi.fn(async () => answer(['https://a.example/1'])),
        executeExpansion: vi.fn(),
      },
      engineDto({ depth: 0, queries: ['x y'] }),
    );

    expect(trace[0]).toMatchObject({ phase: 'search.expansion', status: 'skipped' });
    expect(warnings).toEqual([]);
  });
});
