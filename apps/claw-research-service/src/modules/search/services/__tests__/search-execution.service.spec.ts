import { type Mock, vi } from 'vitest';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { type BusinessException } from '../../../../common/errors/business.exception';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { SearchExecutionMode } from '../../../../common/enums/search-execution-mode.enum';
import { SearchProviderRunStatus } from '../../../../common/enums/search-provider-run-status.enum';
import {
  SEARCH_BREAKER_COOLDOWN_MS,
  SEARCH_BREAKER_FAILURE_THRESHOLD,
} from '../../../../common/constants/search.constants';
import { SearchExecutionService } from '../search-execution.service';
import { SearchProviderHealthService } from '../search-provider-health.service';
import type { SearchAdapterFactory } from '../../adapters/search-adapter.factory';
import type { SearchProviderRepository } from '../../repositories/search-provider.repository';
import type { SearchRunRepository } from '../../repositories/search-run.repository';
import type { SearchProviderService } from '../search-provider.service';
import type { SearchAdapterContext, SearchResult } from '../../types/search.types';

type Behaviour = {
  delayMs?: number;
  fail?: string;
  urls?: string[];
  never?: boolean;
};

describe('SearchExecutionService', () => {
  const buildProvider = (overrides: Record<string, unknown> = {}) => ({
    id: 'provider-1',
    name: 'Exa Primary',
    kind: SearchProviderKind.EXA,
    enabled: true,
    status: 'ACTIVE',
    allowlistDomains: [],
    blocklistDomains: [],
    baseUrl: 'https://api.exa.ai',
    priority: 1,
    timeoutMs: 15_000,
    ...overrides,
  });

  const hit = (url: string, kind: SearchProviderKind, score = 0.8): SearchResult => ({
    id: url,
    title: 'Doc',
    url,
    snippet: 'Snippet',
    publishedAt: null,
    freshness: null,
    score,
    providerKind: kind,
  });

  const context: SearchAdapterContext = {
    baseUrl: 'https://api.example.com',
    credentials: { apiKey: 'secret' },
    publicConfig: {},
    timeoutMs: 5000,
  };

  let providerRepository: { findById: Mock; findEnabled: Mock };
  let runRepository: { create: Mock; update: Mock; findById: Mock; listByUser: Mock };
  let providerService: { buildContext: Mock };
  let adapterFactory: { getAdapter: Mock };
  let service: SearchExecutionService;
  let health: SearchProviderHealthService;
  let recordUsage: Mock;
  let adapterCalls: Record<string, number>;

  /** Fake adapters keyed by provider kind. */
  const installAdapters = (behaviours: Partial<Record<SearchProviderKind, Behaviour>>): void => {
    adapterFactory.getAdapter.mockImplementation((kind: SearchProviderKind) => ({
      search: vi.fn(async (_request, adapterContext: SearchAdapterContext) => {
        adapterCalls[kind] = (adapterCalls[kind] ?? 0) + 1;
        await adapterContext.onNetworkCall?.();
        const behaviour = behaviours[kind] ?? {};
        if (behaviour.never === true) {
          return new Promise(() => {});
        }
        if (behaviour.delayMs !== undefined) {
          await new Promise((resolve) => setTimeout(resolve, behaviour.delayMs));
        }
        if (behaviour.fail !== undefined) {
          throw new Error(behaviour.fail);
        }
        return {
          results: (behaviour.urls ?? [`https://${kind.toLowerCase()}.example/doc`]).map((url) =>
            hit(url, kind),
          ),
          latencyMs: behaviour.delayMs ?? 1,
        };
      }),
    }));
  };

  const kinds = [
    SearchProviderKind.EXA,
    SearchProviderKind.BRAVE,
    SearchProviderKind.TAVILY,
    SearchProviderKind.SERPAPI,
    SearchProviderKind.FIRECRAWL,
    SearchProviderKind.SEARXNG,
    SearchProviderKind.OLLAMA_WEB,
  ];
  const providersOf = (count: number) =>
    kinds
      .slice(0, count)
      .map((kind) => buildProvider({ id: `provider-${kind}`, name: `P-${kind}`, kind }));

  beforeEach(() => {
    adapterCalls = {};
    providerRepository = { findById: vi.fn(), findEnabled: vi.fn() };
    runRepository = {
      create: vi.fn(async () => ({ id: 'run-1', userId: 'user-1', providerId: 'x' })),
      update: vi.fn(async () => ({})),
      findById: vi.fn(),
      listByUser: vi.fn(),
    };
    providerService = { buildContext: vi.fn(() => ({ ...context })) };
    adapterFactory = { getAdapter: vi.fn() };
    recordUsage = vi.fn(async () => {});
    health = new SearchProviderHealthService();
    service = new SearchExecutionService(
      providerRepository as unknown as SearchProviderRepository,
      runRepository as unknown as SearchRunRepository,
      providerService as unknown as SearchProviderService,
      adapterFactory as unknown as SearchAdapterFactory,
      { record: recordUsage } as never,
      health,
    );
  });

  const finalRunUpdate = () =>
    runRepository.update.mock.calls
      .map((call) => call[1] as { status?: string })
      .reverse()
      .find((data) => data.status !== undefined);

  it('runs all four providers and reports each one', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(4));
    installAdapters({});

    const result = await service.execute('user-1', { query: 'latest docs' });

    expect(result.mode).toBe(SearchExecutionMode.AUTO_ALL);
    expect(result.selectionMode).toBe('auto');
    expect(result.providers).toHaveLength(4);
    expect(result.providers.every((p) => p.status === SearchProviderRunStatus.OK)).toBe(true);
    expect(result.providers.every((p) => p.resultCount === 1 && p.errorCode === null)).toBe(true);
    expect(result.results).toHaveLength(4);
    expect(result.results.every((r) => (r.providers?.length ?? 0) === 1)).toBe(true);
    expect(result.searchRequestCount).toBe(4);
    expect(finalRunUpdate()?.status).toBe('COMPLETED');
  });

  it.each([1, 2, 7])('has no hard-coded provider count (N=%i)', async (count) => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(count));
    installAdapters({});

    const result = await service.execute('user-1', { query: 'q', maxResults: 25 });

    expect(result.providers).toHaveLength(count);
    expect(result.attemptedProviders).toHaveLength(count);
    expect(Object.values(adapterCalls).reduce((a, b) => a + b, 0)).toBe(count);
    expect(result.results).toHaveLength(count);
  });

  it('waits for the slowest provider: latency is the max, not the sum', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(3));
    installAdapters({
      [SearchProviderKind.EXA]: { delayMs: 40 },
      [SearchProviderKind.BRAVE]: { delayMs: 120 },
      [SearchProviderKind.TAVILY]: { delayMs: 40 },
    });

    const started = Date.now();
    const result = await service.execute('user-1', { query: 'q' });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(115);
    expect(elapsed).toBeLessThan(195);
    expect(result.results).toHaveLength(3);
    expect(result.latencyMs).toBeGreaterThanOrEqual(115);
  });

  it('bounds a hung provider by its own timeout and does not return before it', async () => {
    providerRepository.findEnabled.mockResolvedValue([
      buildProvider({ id: 'a', name: 'Fast', kind: SearchProviderKind.EXA }),
      buildProvider({ id: 'b', name: 'Hung', kind: SearchProviderKind.BRAVE, timeoutMs: 150 }),
    ]);
    installAdapters({ [SearchProviderKind.BRAVE]: { never: true } });

    const started = Date.now();
    const result = await service.execute('user-1', { query: 'q' });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(145);
    expect(elapsed).toBeLessThan(400);
    const hung = result.providers.find((p) => p.name === 'Hung');
    expect(hung).toMatchObject({
      status: SearchProviderRunStatus.TIMEOUT,
      errorCode: ResearchErrorCode.SEARCH_TIMEOUT,
      resultCount: 0,
    });
    expect(result.results).toHaveLength(1);
  });

  it('tolerates one failing provider and reports it', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(4));
    installAdapters({ [SearchProviderKind.BRAVE]: { fail: 'Brave search failed: HTTP 500' } });

    const result = await service.execute('user-1', { query: 'q' });

    expect(result.results).toHaveLength(3);
    expect(result.providers.find((p) => p.kind === SearchProviderKind.BRAVE)).toMatchObject({
      status: SearchProviderRunStatus.FAILED,
      errorCode: ResearchErrorCode.PROVIDER_UNAVAILABLE,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('failed: Brave search failed: HTTP 500')]),
    );
  });

  it('maps an HTTP 429 to PROVIDER_RATE_LIMITED', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(2));
    installAdapters({ [SearchProviderKind.BRAVE]: { fail: 'Brave search failed: HTTP 429' } });

    const result = await service.execute('user-1', { query: 'q' });

    expect(result.providers.find((p) => p.kind === SearchProviderKind.BRAVE)?.errorCode).toBe(
      ResearchErrorCode.PROVIDER_RATE_LIMITED,
    );
  });

  it('when every provider fails: typed error, ONE call each, run FAILED, no second round', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(4));
    const failures: Partial<Record<SearchProviderKind, Behaviour>> = {};
    for (const kind of kinds) {
      failures[kind] = { fail: 'boom' };
    }
    installAdapters(failures);

    await expect(service.execute('user-1', { query: 'q' })).rejects.toMatchObject<
      Partial<BusinessException>
    >({ code: ResearchErrorCode.SEARCH_FAILED });

    expect(Object.values(adapterCalls)).toEqual([1, 1, 1, 1]);
    expect(recordUsage).toHaveBeenCalledTimes(4);
    expect(finalRunUpdate()?.status).toBe('FAILED');
  });

  it('never leaves the run RUNNING when something unexpected throws', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(2));
    installAdapters({});
    let completeAttempt = true;
    runRepository.update.mockImplementation(async (_id: string, data: { status?: string }) => {
      if (completeAttempt && data.status === 'COMPLETED') {
        completeAttempt = false;
        throw new Error('db down');
      }
      return {};
    });

    const result = await service.execute('user-1', { query: 'q' });

    expect(result.results).toEqual([]);
    expect(finalRunUpdate()?.status).toBe('FAILED');
  });

  it('opens the breaker after repeated failures and skips the dead provider', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(2));
    installAdapters({ [SearchProviderKind.BRAVE]: { fail: 'Brave search failed: HTTP 503' } });
    for (let i = 0; i < SEARCH_BREAKER_FAILURE_THRESHOLD; i += 1) {
      await service.execute('user-1', { query: 'q' });
    }
    const callsBefore = adapterCalls[SearchProviderKind.BRAVE];

    const result = await service.execute('user-1', { query: 'q' });

    expect(adapterCalls[SearchProviderKind.BRAVE]).toBe(callsBefore);
    expect(result.providers.find((p) => p.kind === SearchProviderKind.BRAVE)).toMatchObject({
      status: SearchProviderRunStatus.SKIPPED,
      latencyMs: 0,
    });
    expect(result.results).toHaveLength(1);
  });

  it('half-open: a probe after the cool-down closes the breaker when the provider recovers', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      providerRepository.findEnabled.mockResolvedValue(providersOf(2));
      installAdapters({ [SearchProviderKind.BRAVE]: { fail: 'HTTP 503' } });
      for (let i = 0; i < SEARCH_BREAKER_FAILURE_THRESHOLD; i += 1) {
        await service.execute('user-1', { query: 'q' });
      }
      installAdapters({});
      vi.setSystemTime(Date.now() + SEARCH_BREAKER_COOLDOWN_MS + 1);

      const probe = await service.execute('user-1', { query: 'q' });
      const after = await service.execute('user-1', { query: 'q' });

      expect(probe.providers.every((p) => p.status === SearchProviderRunStatus.OK)).toBe(true);
      expect(after.providers.every((p) => p.status === SearchProviderRunStatus.OK)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never skips everyone: all breakers open still tries every provider', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(2));
    const failing: Partial<Record<SearchProviderKind, Behaviour>> = {
      [SearchProviderKind.EXA]: { fail: 'HTTP 503' },
      [SearchProviderKind.BRAVE]: { fail: 'HTTP 503' },
    };
    installAdapters(failing);
    for (let i = 0; i < SEARCH_BREAKER_FAILURE_THRESHOLD; i += 1) {
      await expect(service.execute('user-1', { query: 'q' })).rejects.toBeDefined();
    }
    installAdapters({});

    const result = await service.execute('user-1', { query: 'q' });

    expect(result.providers.every((p) => p.status === SearchProviderRunStatus.OK)).toBe(true);
  });

  it('merges rank-normalised results with provenance and de-duplicates by canonical URL', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(2));
    installAdapters({
      [SearchProviderKind.EXA]: {
        urls: ['https://www.shared.example/page/?utm_source=a', 'https://exa.example/only'],
      },
      [SearchProviderKind.BRAVE]: { urls: ['https://shared.example/page'] },
    });

    const result = await service.execute('user-1', { query: 'q' });

    expect(result.results).toHaveLength(2);
    const shared = result.results.find((r) => r.url.includes('shared.example'));
    expect(shared?.providers).toEqual(['P-EXA', 'P-BRAVE']);
    expect(result.results[0]).toBe(shared);
  });

  it('records a WEB_SEARCH unit for every adapter call (N providers = N units)', async () => {
    providerRepository.findEnabled.mockResolvedValue(providersOf(4));
    installAdapters({});

    await service.execute('user-1', { query: 'q' });

    expect(recordUsage).toHaveBeenCalledTimes(4);
    expect(recordUsage.mock.calls.every((call) => call[1] === 'WEB_SEARCH')).toBe(true);
    expect(new Set(recordUsage.mock.calls.map((call) => call[2])).size).toBe(4);
  });

  it('uses provider ranking for auto mode and attributes the run to a provider that answered', async () => {
    const firecrawl = buildProvider({
      id: 'provider-firecrawl',
      name: 'Firecrawl',
      kind: SearchProviderKind.FIRECRAWL,
    });
    const exa = buildProvider({ id: 'provider-exa', name: 'Exa', kind: SearchProviderKind.EXA });
    providerRepository.findEnabled.mockResolvedValue([exa, firecrawl]);
    installAdapters({ [SearchProviderKind.FIRECRAWL]: { fail: 'timeout' } });

    const result = await service.execute('user-1', {
      query: 'latest docs',
      filters: { researchWorkflow: 'SEARCH_FETCH_EXTRACT' },
    });

    expect(result.providerId).toBe('provider-exa');
    expect(result.fallbackUsed).toBe(true);
    expect(result.attemptedProviders).toEqual(['Firecrawl', 'Exa']);
    expect(result.searchRequestCount).toBe(2);
    expect(result.warnings).toEqual(expect.arrayContaining(['Provider Firecrawl failed: timeout']));
  });

  it('honors an explicit provider selection (unchanged shape and scores)', async () => {
    const brave = buildProvider({
      id: 'provider-brave',
      name: 'Brave',
      kind: SearchProviderKind.BRAVE,
    });
    providerRepository.findById.mockResolvedValue(brave);
    adapterFactory.getAdapter.mockReturnValue({
      search: vi.fn(async (_request, adapterContext: SearchAdapterContext) => {
        await adapterContext.onNetworkCall?.();
        await adapterContext.onNetworkCall?.();
        return {
          results: [hit('https://b.example/1', SearchProviderKind.BRAVE, 0.42)],
          latencyMs: 10,
        };
      }),
    });

    const result = await service.execute('user-1', {
      providerId: 'provider-brave',
      query: 'weather',
    });

    expect(result.providerId).toBe('provider-brave');
    expect(result.selectionMode).toBe('explicit');
    expect(result.mode).toBe(SearchExecutionMode.EXPLICIT);
    expect(result.providers).toHaveLength(1);
    expect(result.fallbackUsed).toBe(false);
    expect(result.attemptedProviders).toEqual(['Brave']);
    expect(result.searchRequestCount).toBe(2);
    expect(result.results[0]?.score).toBe(0.42);
    expect(result.results[0]?.providers).toBeUndefined();
    expect(recordUsage.mock.calls).toEqual([
      ['user-1', 'WEB_SEARCH', 'run-1:provider-brave:1'],
      ['user-1', 'WEB_SEARCH', 'run-1:provider-brave:2'],
    ]);
  });

  it('fails with NO_ENABLED_PROVIDER when auto mode has no providers', async () => {
    providerRepository.findEnabled.mockResolvedValue([]);

    await expect(service.execute('user-1', { query: 'hello' })).rejects.toMatchObject<
      Partial<BusinessException>
    >({ code: ResearchErrorCode.NO_ENABLED_PROVIDER });
  });
});
