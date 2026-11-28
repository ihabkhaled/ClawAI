import { describe, expect, it, type Mock, vi } from 'vitest';

import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchExecutionMode } from '../../../../common/enums/search-execution-mode.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearchProviderRunStatus } from '../../../../common/enums/search-provider-run-status.enum';
import {
  PlatformAccessMethod,
  PlatformApiKind,
  PlatformCategory,
  type ResearchPlatform,
} from '../../../../generated/prisma';
import { SearchExecutionService } from '../../../search/services/search-execution.service';
import { SearchProviderHealthService } from '../../../search/services/search-provider-health.service';
import { ResearchEvidenceStoreService } from '../../services/research-evidence-store.service';
import { MultiQuerySearchManager } from '../multi-query-search.manager';
import { ResearchManager } from '../research.manager';
import type { PlatformApiOutcome } from '../../../platforms/types/platform.types';
import type { SearchAdapterContext } from '../../../search/types/search.types';
import type { SearchExecutionResult } from '../../../search/types/search-execution-result.types';
import type { ExecuteResearchDto } from '../../dto/execute-research.dto';
import type { EvidenceBundle, ResearchTraceEntry } from '../../types/evidence-bundle.types';

const platform = (
  slug: string,
  category: PlatformCategory,
  overrides: Partial<ResearchPlatform> = {},
): ResearchPlatform => ({
  id: slug,
  slug,
  name: slug,
  category,
  accessMethod: PlatformAccessMethod.SITE_SEARCH,
  apiKind: null,
  domains: [`${slug}.com`],
  languages: [],
  enabled: true,
  priority: 50,
  maxResults: 5,
  timeoutMs: 8000,
  notes: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});
const apiPlatform = (
  slug: string,
  apiKind: PlatformApiKind,
  category: PlatformCategory,
  priority = 50,
) =>
  platform(slug, category, {
    accessMethod: PlatformAccessMethod.OFFICIAL_API,
    apiKind,
    priority,
    domains: [`${slug}.org`],
  });

const REGISTRY: ResearchPlatform[] = [
  apiPlatform('semantic-scholar', PlatformApiKind.SEMANTIC_SCHOLAR, PlatformCategory.ACADEMIC, 20),
  apiPlatform('openalex', PlatformApiKind.OPENALEX, PlatformCategory.ACADEMIC, 10),
  apiPlatform('wikipedia', PlatformApiKind.WIKIPEDIA, PlatformCategory.REFERENCE, 10),
  apiPlatform('github', PlatformApiKind.GITHUB, PlatformCategory.TECHNICAL, 20),
  platform('reddit', PlatformCategory.FORUM, { priority: 10 }),
  platform('quora', PlatformCategory.FORUM, { priority: 20 }),
  platform('youtube', PlatformCategory.VIDEO, { domains: ['youtube.com', 'youtu.be'] }),
  platform('arxiv-site', PlatformCategory.ACADEMIC, { domains: ['arxiv.org'], priority: 90 }),
  platform('disabled-forum', PlatformCategory.FORUM, { enabled: false, priority: 1 }),
];

const hitOf = (url: string, score = 0.9) => ({
  id: url,
  title: `T ${url}`,
  url,
  snippet: `snippet of ${url}`,
  publishedAt: null,
  freshness: null,
  score,
  providerKind: SearchProviderKind.OLLAMA_WEB,
});

const answer = (urls: string[], kind = 'OLLAMA_WEB'): SearchExecutionResult => ({
  runId: 'sr',
  providerId: 'p1',
  providerName: 'Ollama Web',
  providerKind: SearchProviderKind.OLLAMA_WEB,
  selectionMode: ProviderSelectionMode.AUTO,
  mode: SearchExecutionMode.AUTO_ALL,
  providers: [
    {
      name: 'Ollama Web',
      kind,
      status: SearchProviderRunStatus.OK,
      latencyMs: 1,
      resultCount: urls.length,
      errorCode: null,
    },
  ],
  fallbackUsed: false,
  attemptedProviders: ['Ollama Web'],
  searchRequestCount: 1,
  query: 'q',
  results: urls.map((url) => hitOf(url)),
  latencyMs: 1,
});

const apiOutcome = (
  slug: string,
  urls: string[],
  overrides: Partial<PlatformApiOutcome> = {},
): PlatformApiOutcome => {
  const row = REGISTRY.find((entry) => entry.slug === slug);
  return {
    slug,
    name: slug,
    category: row?.category ?? PlatformCategory.ACADEMIC,
    language: null,
    ok: true,
    results: urls.map((url, index) => ({
      ...hitOf(url, 1 - index / 10),
      providerKind: `PLATFORM:${slug}`,
      platform: slug,
      platformCategory: row?.category ?? PlatformCategory.ACADEMIC,
    })),
    latencyMs: 7,
    errorCode: null,
    ...overrides,
  };
};

type Harness = {
  manager: ResearchManager;
  search: { execute: Mock; executeCached: Mock; executeExpansion: Mock; findGoogleProvider: Mock };
  platforms: { loadEnabled: Mock; runApiPlatforms: Mock };
  fetchPage: Mock;
  runs: { create: Mock; update: Mock };
};

const harness = (): Harness => {
  const runs = {
    create: vi.fn(async () => ({ id: 'run-1' })),
    update: vi.fn(async (id: string, data: object) => ({ id, ...data })),
  };
  const search = {
    findGoogleProvider: vi.fn(async () => null),
    execute: vi.fn(async () => answer(['https://a.example/1'])),
    executeCached: vi.fn(async () =>
      answer(['https://a.example/1', 'https://old.reddit.com/r/ml/x']),
    ),
    executeExpansion: vi.fn(async (_u: string, dto: { query: string }) => {
      if (dto.query.startsWith('site:reddit.com')) {
        return answer(['https://www.reddit.com/r/ml/comments/1']);
      }
      // Any other site: query comes back off-domain (a provider ignoring the operator).
      return dto.query.startsWith('site:')
        ? answer(['https://off-domain.example/ignored-site-operator'])
        : answer([`https://x.example/${dto.query.replaceAll(' ', '-')}`]);
    }),
  };
  const platforms = {
    loadEnabled: vi.fn(async () => REGISTRY),
    runApiPlatforms: vi.fn(async (_u: string, rows: ResearchPlatform[]) =>
      rows.map((row) => {
        if (row.slug === 'openalex') {
          return apiOutcome('openalex', ['https://arxiv.org/abs/2101.1', 'https://doi.org/10.1/x']);
        }
        return row.slug === 'semantic-scholar'
          ? apiOutcome('semantic-scholar', [], {
              ok: false,
              errorCode: ResearchErrorCode.PROVIDER_RATE_LIMITED,
            })
          : apiOutcome(row.slug, []);
      }),
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
  const sources = { createMany: vi.fn(async () => 0), findRecentByThread: vi.fn(async () => []) };
  const searchService = search as unknown as SearchExecutionService;
  const manager = new ResearchManager(
    runs as never,
    searchService,
    { fetchPage } as never,
    { extract: vi.fn() } as never,
    { record: vi.fn(async () => {}) } as never,
    { crawl: vi.fn(async () => []) } as never,
    { analyze: vi.fn(() => []) } as never,
    new MultiQuerySearchManager(searchService, platforms as never),
    new ResearchEvidenceStoreService(sources as never),
  );
  return { manager, search, platforms, fetchPage, runs };
};

const bundleOf = (h: Harness): EvidenceBundle =>
  (h.runs.update.mock.calls.at(-1)?.[1] as { bundle: EvidenceBundle }).bundle;
const traceOf = (h: Harness): ResearchTraceEntry[] =>
  (h.runs.update.mock.calls.at(-1)?.[1] as { trace: ResearchTraceEntry[] }).trace;
const expansionQueries = (h: Harness): string[] =>
  h.search.executeExpansion.mock.calls.map((call) => (call[1] as { query: string }).query);

const dto = (extra: Partial<ExecuteResearchDto> = {}): ExecuteResearchDto => ({
  intent: 'transformer interpretability',
  workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
  depth: 2,
  platforms: [PlatformCategory.ACADEMIC, PlatformCategory.FORUM, PlatformCategory.REFERENCE],
  ...extra,
});

describe('platform run gate (B3)', () => {
  it.each([
    ['depth 1 with platforms', { depth: 1 }],
    ['depth absent with platforms', { depth: undefined, threadId: 't1' }],
    ['depth 2 without platforms', { platforms: undefined }],
    ['depth 2 with an empty list', { platforms: [] }],
  ])(
    '%s: B2 exactly — no registry read, no platform fields, no stats.platforms',
    async (_name, extra) => {
      const h = harness();

      await h.manager.run('u1', dto(extra));

      expect(h.platforms.loadEnabled).not.toHaveBeenCalled();
      expect(h.platforms.runApiPlatforms).not.toHaveBeenCalled();
      expect(expansionQueries(h).some((query) => query.startsWith('site:'))).toBe(false);
      const bundle = bundleOf(h);
      expect(bundle.stats).not.toHaveProperty('platforms');
      for (const item of bundle.items) {
        expect(item).not.toHaveProperty('platform');
      }
      const filters = (h.search.executeCached.mock.calls[0]?.[1] as { filters: object }).filters;
      expect(filters).not.toHaveProperty('language');
    },
  );

  it('platforms alone never switch an old-shape request into engine mode', async () => {
    const h = harness();

    await h.manager.run('u1', {
      intent: 'x y z',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
      platforms: [PlatformCategory.NEWS],
    });

    expect(h.search.execute).toHaveBeenCalledTimes(1);
    expect(h.search.executeCached).not.toHaveBeenCalled();
    expect(bundleOf(h)).not.toHaveProperty('stats');
  });
});

describe('platform run (depth >= 2 + platforms)', () => {
  it('reads the registry once and calls the official APIs of the asked categories, priority order', async () => {
    const h = harness();

    await h.manager.run('u1', dto());

    expect(h.platforms.loadEnabled).toHaveBeenCalledTimes(1);
    const [, rows, query, languages] = h.platforms.runApiPlatforms.mock.calls[0] as [
      string,
      ResearchPlatform[],
      string,
      string[],
    ];
    expect(rows.map((row) => row.slug)).toEqual(['openalex', 'wikipedia', 'semantic-scholar']);
    expect(query).toBe('transformer interpretability');
    expect(languages).toEqual(['en']);
  });

  it('caps official APIs at 6 and site searches at 4 (and at the shared depth budget)', async () => {
    const h = harness();
    h.platforms.loadEnabled.mockResolvedValueOnce([
      ...Array.from({ length: 9 }, (_, i) =>
        apiPlatform(`api-${String(i)}`, PlatformApiKind.CROSSREF, PlatformCategory.ACADEMIC, i),
      ),
      ...Array.from({ length: 7 }, (_, i) =>
        platform(`site-${String(i)}`, PlatformCategory.FORUM, { priority: i }),
      ),
    ]);

    await h.manager.run('u1', dto({ depth: 5 }));

    const rows = h.platforms.runApiPlatforms.mock.calls[0]?.[1] as ResearchPlatform[];
    expect(rows.map((row) => row.slug)).toEqual([
      'api-0',
      'api-1',
      'api-2',
      'api-3',
      'api-4',
      'api-5',
    ]);
    const sites = expansionQueries(h).filter((query) => query.startsWith('site:'));
    expect(sites).toEqual([
      'site:site-0.com transformer interpretability',
      'site:site-1.com transformer interpretability',
      'site:site-2.com transformer interpretability',
      'site:site-3.com transformer interpretability',
    ]);
  });

  it('site searches run on EXPANSION providers only and share the depth query budget with expansions', async () => {
    const h = harness();

    // depth 2 = 4 queries: primary + 3 extra; 3 expansions asked + 3 site platforms → 1 expansion, 2 site.
    await h.manager.run('u1', dto({ queries: ['q one', 'q two', 'q three'] }));

    expect(h.search.executeCached).toHaveBeenCalledTimes(1);
    expect((h.search.executeCached.mock.calls[0]?.[1] as { query: string }).query).toBe(
      'transformer interpretability',
    );
    expect(expansionQueries(h)).toEqual([
      'q one',
      'site:reddit.com transformer interpretability',
      'site:quora.com transformer interpretability',
    ]);
    expect(bundleOf(h).stats?.queriesRun).toBe(4);
  });

  it('Wikipedia once per requested language, at most 3; one known language reaches language-aware providers', async () => {
    const h = harness();

    await h.manager.run('u1', dto({ languages: ['de', 'fr', 'es', 'it'] }));
    expect(h.platforms.runApiPlatforms.mock.calls[0]?.[3]).toEqual(['de', 'fr', 'es']);
    expect(
      (h.search.executeCached.mock.calls[0]?.[1] as { filters: object }).filters,
    ).not.toHaveProperty('language');

    const single = harness();
    await single.manager.run('u1', dto({ languages: ['ar'] }));
    expect(single.platforms.runApiPlatforms.mock.calls[0]?.[3]).toEqual(['ar']);
    expect(
      (single.search.executeCached.mock.calls[0]?.[1] as { filters: object }).filters,
    ).toMatchObject({
      language: 'ar',
    });
  });

  it('merges API results into the RRF pool with PLATFORM:<slug>, platform and category', async () => {
    const h = harness();

    await h.manager.run('u1', dto({ workflow: ResearchWorkflowKind.SEARCH_ONLY }));

    const items = bundleOf(h).items;
    const fromApi = items.find((item) => item.url === 'https://doi.org/10.1/x');
    expect(fromApi).toMatchObject({
      providerKind: 'PLATFORM:openalex',
      platform: 'openalex',
      platformCategory: PlatformCategory.ACADEMIC,
      source: 'search',
    });
    // An API hit keeps its own platform even when its host matches another platform's domain.
    expect(items.find((item) => item.url === 'https://arxiv.org/abs/2101.1')?.platform).toBe(
      'openalex',
    );
  });

  it('tags ANY item whose host matches a platform domain (suffix on a label boundary), pages included', async () => {
    const h = harness();

    await h.manager.run('u1', dto());

    const items = bundleOf(h).items;
    const redditPage = items.find((item) => item.url === 'https://old.reddit.com/r/ml/x');
    expect(redditPage).toMatchObject({
      source: 'fetch',
      platform: 'reddit',
      platformCategory: PlatformCategory.FORUM,
    });
    expect(items.find((item) => item.url === 'https://a.example/1')).not.toHaveProperty('platform');
    expect(
      items.find((item) => item.url === 'https://www.reddit.com/r/ml/comments/1')?.platform,
    ).toBe('reddit');
  });

  it('stats.platforms = platforms that returned results; failures are warned, off-domain site hits not credited', async () => {
    const h = harness();

    await h.manager.run('u1', dto());

    const bundle = bundleOf(h);
    // openalex answered with hits; wikipedia answered empty; semantic-scholar failed (429);
    // reddit's site search found reddit; quora's provider ignored `site:` (off-domain only).
    expect(bundle.stats?.platforms).toEqual(['openalex', 'reddit']);
    expect(bundle.warnings).toContain(
      'A research platform did not answer: semantic-scholar (PROVIDER_RATE_LIMITED).',
    );
    const platformsTrace = traceOf(h).find((entry) => entry.phase === 'platforms');
    expect(platformsTrace).toMatchObject({ status: 'warning' });
    // depth 2 leaves 3 extra queries and no expansion was asked: reddit, quora and arxiv-site all run.
    expect(platformsTrace?.message).toBe(
      '2/3 platform API calls answered; 3 site searches; 2 platforms returned results',
    );
  });

  it('stats.languages = languages actually searched (Wikipedia editions that answered, honoured filters)', async () => {
    const h = harness();
    h.platforms.runApiPlatforms.mockResolvedValueOnce([
      { ...apiOutcome('wikipedia', ['https://de.wikipedia.org/wiki/X']), language: 'de' },
      {
        ...apiOutcome('wikipedia', []),
        language: 'fr',
        ok: false,
        errorCode: ResearchErrorCode.SEARCH_TIMEOUT,
      },
    ]);
    await h.manager.run('u1', dto({ languages: ['de', 'fr'] }));
    expect(bundleOf(h).stats?.languages).toEqual(['de']);

    const searx = harness();
    searx.search.executeCached.mockResolvedValueOnce(answer(['https://a.example/1'], 'SEARXNG'));
    searx.platforms.runApiPlatforms.mockResolvedValueOnce([]);
    await searx.manager.run('u1', dto({ languages: ['ja'] }));
    expect(bundleOf(searx).stats?.languages).toEqual(['ja']);

    const none = harness();
    none.platforms.runApiPlatforms.mockResolvedValueOnce([]);
    await none.manager.run('u1', dto({ languages: ['ja'] }));
    expect(bundleOf(none).stats?.languages).toEqual([]);
  });

  it('an explicit search provider means no official API runs (the user picked one source)', async () => {
    const h = harness();

    await h.manager.run('u1', dto({ searchProviderId: 'tavily-1' }));

    expect(h.platforms.runApiPlatforms).not.toHaveBeenCalled();
  });

  it('the research.run log line carries platforms=<n>', async () => {
    const h = harness();
    const log = vi.spyOn(
      (h.manager as unknown as { logger: { log: (m: string) => void } }).logger,
      'log',
    );

    await h.manager.run('u1', dto());

    const line = log.mock.calls
      .map((call) => String(call[0]))
      .find((entry) => entry.startsWith('research.run:'));
    expect(line).toMatch(/ depth=2 platforms=2 ms=\d+$/u);
    expect(line).not.toContain('transformer');
  });
});

describe('cost rule: round >= 2 runs the PRIMARY on expansion providers only', () => {
  it('round 1 (or none): the primary goes to every provider (executeCached)', async () => {
    const h = harness();

    await h.manager.run('u1', dto({ platforms: undefined, round: 1 }));

    expect(h.search.executeCached).toHaveBeenCalledTimes(1);
    expect(expansionQueries(h)).not.toContain('transformer interpretability');
  });

  it('round 2: the primary goes to expansion providers (executeExpansion), never to every provider', async () => {
    const h = harness();

    await h.manager.run('u1', dto({ platforms: undefined, round: 2 }));

    expect(h.search.executeCached).not.toHaveBeenCalled();
    expect(expansionQueries(h)).toContain('transformer interpretability');
    expect(bundleOf(h).stats?.queries).toEqual(['transformer interpretability']);
  });

  it('round 2 with no expansion provider: one warning, a skipped trace, no provider named', async () => {
    const h = harness();
    h.search.executeExpansion.mockResolvedValue(null);

    await h.manager.run(
      'u1',
      dto({ platforms: undefined, round: 3, workflow: ResearchWorkflowKind.SEARCH_ONLY }),
    );

    const bundle = bundleOf(h);
    expect(bundle.warnings).toContain(
      'The main search query was skipped in this follow-up round: no search provider is enabled for query expansion.',
    );
    expect(traceOf(h).find((entry) => entry.phase === 'search')).toMatchObject({
      status: 'skipped',
    });
    expect(bundle.providerSelection).toMatchObject({
      providerId: null,
      selectionMode: ProviderSelectionMode.NONE,
    });
    expect(bundle.stats?.queriesRun).toBe(0);
  });

  it('end to end through SearchExecutionService: round 2 asks the expansion providers and Google once, never another paid provider', async () => {
    const providers = [
      SearchProviderKind.EXA,
      SearchProviderKind.OLLAMA_WEB,
      SearchProviderKind.SERPAPI,
    ].map((kind) => ({
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
      publicConfig: {},
    }));
    const calledKinds: string[] = [];
    const service = new SearchExecutionService(
      { findEnabled: vi.fn(async () => providers), findById: vi.fn() } as never,
      {
        create: vi.fn(async () => ({ id: 'run-1', userId: 'u1' })),
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
        getAdapter: vi.fn((kind: string) => ({
          search: async (_request: unknown, context: SearchAdapterContext) => {
            calledKinds.push(kind);
            await context.onNetworkCall?.();
            return { results: [hitOf(`https://${kind.toLowerCase()}.example/1`)], latencyMs: 1 };
          },
        })),
      } as never,
      { record: vi.fn(async () => {}) } as never,
      new SearchProviderHealthService(),
      { read: vi.fn(async () => null), write: vi.fn(async () => {}) } as never,
    );
    const manager = new MultiQuerySearchManager(service, {} as never);
    const state = {
      round: 2,
      depth: null,
      expansionCap: 0,
      excludes: () => false,
      recordSearch: vi.fn(),
      recordGoogle: vi.fn(),
    };

    await manager.run(
      'u1',
      dto({ platforms: undefined, depth: undefined, round: 2 }),
      state as never,
      [],
      [],
      [],
    );
    expect(calledKinds.sort()).toEqual(['OLLAMA_WEB', 'SERPAPI']);

    calledKinds.length = 0;
    await manager.run(
      'u1',
      dto({ platforms: undefined, depth: undefined, round: 1 }),
      { ...state, round: 1 } as never,
      [],
      [],
      [],
    );
    expect(calledKinds.sort()).toEqual(['EXA', 'OLLAMA_WEB', 'SERPAPI']);
  });
});

describe('old path: a read page is never thrown away for its own search hit (B3 fix)', () => {
  it('a top hit (score 1) and its fetched page tie on confidence: the page is kept, the hit dropped', async () => {
    const h = harness();
    h.search.execute.mockResolvedValueOnce({
      ...answer([]),
      results: [hitOf('https://top.example/article', 1), hitOf('https://other.example/b', 0.5)],
    });

    await h.manager.run('u1', {
      intent: 'top article',
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
    });

    const items = bundleOf(h).items.filter((item) => item.url === 'https://top.example/article');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: 'fetch',
      snippet: 'Distinct body for https://top.example/article',
      confidence: 1,
    });
    expect(bundleOf(h)).not.toHaveProperty('stats');
  });
});
