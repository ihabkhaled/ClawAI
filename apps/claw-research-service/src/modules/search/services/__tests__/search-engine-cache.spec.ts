import { describe, expect, it, type Mock, vi } from 'vitest';

import {
  SEARCH_BREAKER_COOLDOWN_MS,
  SEARCH_BREAKER_FAILURE_THRESHOLD,
  SEARCH_CACHE_KEY_PREFIX,
  SEARCH_CACHE_TTL_SECONDS,
} from '../../../../common/constants/search.constants';
import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { SearchExecutionMode } from '../../../../common/enums/search-execution-mode.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearchProviderRunStatus } from '../../../../common/enums/search-provider-run-status.enum';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import {
  isExpansionProvider,
  narrowToExpansionProviders,
} from '../../utilities/expansion-provider.utility';
import { searchCacheKey } from '../../utilities/search-cache-key.utility';
import { SearchExecutionService } from '../search-execution.service';
import { SearchProviderHealthService } from '../search-provider-health.service';
import { SearchResultCacheService } from '../search-result-cache.service';
import type { SearchAdapterContext } from '../../types/search.types';
import type { SearchExecutionResult } from '../../types/search-execution-result.types';

const provider = (kind: SearchProviderKind, publicConfig: unknown = {}, id = `p-${kind}`) => ({
  id,
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

const result = (overrides: Partial<SearchExecutionResult> = {}): SearchExecutionResult => ({
  runId: 'r',
  providerId: 'p',
  providerName: 'P',
  providerKind: SearchProviderKind.EXA,
  selectionMode: ProviderSelectionMode.AUTO,
  mode: SearchExecutionMode.AUTO_ALL,
  providers: [
    {
      name: 'P',
      kind: 'EXA',
      status: SearchProviderRunStatus.OK,
      latencyMs: 1,
      resultCount: 1,
      errorCode: null,
    },
  ],
  fallbackUsed: false,
  attemptedProviders: ['P'],
  searchRequestCount: 1,
  query: 'q',
  results: [
    {
      id: 'a',
      title: 'A',
      url: 'https://a.example',
      snippet: null,
      publishedAt: null,
      freshness: null,
      score: 1,
      providerKind: SearchProviderKind.EXA,
    },
  ],
  latencyMs: 1,
  ...overrides,
});

describe('expansion providers (cost rule)', () => {
  it('OLLAMA_WEB and SEARXNG by default, nothing else', () => {
    expect(isExpansionProvider(provider(SearchProviderKind.OLLAMA_WEB) as never)).toBe(true);
    expect(isExpansionProvider(provider(SearchProviderKind.SEARXNG) as never)).toBe(true);
    expect(isExpansionProvider(provider(SearchProviderKind.SERPAPI) as never)).toBe(false);
    expect(isExpansionProvider(provider(SearchProviderKind.EXA) as never)).toBe(false);
  });

  it('publicConfig.expansion overrides both ways; a non-boolean is ignored', () => {
    expect(
      isExpansionProvider(provider(SearchProviderKind.EXA, { expansion: true }) as never),
    ).toBe(true);
    expect(
      isExpansionProvider(provider(SearchProviderKind.OLLAMA_WEB, { expansion: false }) as never),
    ).toBe(false);
    expect(
      isExpansionProvider(provider(SearchProviderKind.EXA, { expansion: 'yes' }) as never),
    ).toBe(false);
    expect(isExpansionProvider(provider(SearchProviderKind.SEARXNG, null) as never)).toBe(true);
    expect(isExpansionProvider(provider(SearchProviderKind.SEARXNG, ['x']) as never)).toBe(true);
  });

  it('narrows a selection in rank order; null when none qualifies', () => {
    const exa = provider(SearchProviderKind.EXA);
    const ollama = provider(SearchProviderKind.OLLAMA_WEB);
    const selection = {
      primary: exa,
      candidates: [exa, ollama],
      mode: ProviderSelectionMode.AUTO,
      executionMode: SearchExecutionMode.AUTO_ALL,
    };
    expect(narrowToExpansionProviders(selection as never)).toMatchObject({
      primary: ollama,
      candidates: [ollama],
    });
    expect(narrowToExpansionProviders({ ...selection, candidates: [exa] } as never)).toBeNull();
  });
});

describe('searchCacheKey', () => {
  it('normalises the query and sorts provider ids', () => {
    const key = searchCacheKey('  EU   AI act ', ['b', 'a'], 10);
    expect(key.startsWith(SEARCH_CACHE_KEY_PREFIX)).toBe(true);
    expect(key).toMatch(/^research:search:v1:[0-9a-f]{64}$/u);
    expect(key).toBe(searchCacheKey('eu ai act', ['a', 'b'], 10));
    expect(key).not.toBe(searchCacheKey('eu ai act', ['a', 'b'], 5));
    expect(key).not.toBe(searchCacheKey('eu ai act', ['a'], 10));
  });
});

describe('SearchResultCacheService', () => {
  const build = (redis: Partial<Record<'getBounded' | 'setBounded', Mock>>) => {
    const service = new SearchResultCacheService(redis as unknown as RedisService);
    const warn = vi.spyOn((service as unknown as { logger: { warn: () => void } }).logger, 'warn');
    return { service, warn };
  };

  it('a hit is marked cached with zero requests', async () => {
    const { service } = build({ getBounded: vi.fn().mockResolvedValue(JSON.stringify(result())) });
    await expect(service.read('k')).resolves.toMatchObject({ cached: true, searchRequestCount: 0 });
  });

  it('absent or malformed values are misses', async () => {
    expect(
      await build({ getBounded: vi.fn().mockResolvedValue(null) }).service.read('k'),
    ).toBeNull();
    expect(
      await build({ getBounded: vi.fn().mockResolvedValue('{"results":1}') }).service.read('k'),
    ).toBeNull();
  });

  it('a Redis failure is a miss, logged once at warn', async () => {
    const { service, warn } = build({
      getBounded: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      setBounded: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    await expect(service.read('k')).resolves.toBeNull();
    await expect(service.read('k')).resolves.toBeNull();
    await service.write('k', result());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('research.search_cache.unavailable'));
  });

  it('writes a complete answer for the TTL, never a partial or empty one', async () => {
    const setBounded = vi.fn().mockResolvedValue(undefined);
    const { service } = build({ setBounded });

    await service.write('k', result({ cached: true }));
    expect(setBounded).toHaveBeenCalledWith(
      'k',
      expect.any(String),
      SEARCH_CACHE_TTL_SECONDS,
      expect.any(Number),
    );
    expect(JSON.parse(setBounded.mock.calls[0]?.[1] as string)).not.toHaveProperty('cached');

    await service.write('k', result({ results: [] }));
    await service.write(
      'k',
      result({
        providers: [{ ...result().providers[0]!, status: SearchProviderRunStatus.TIMEOUT }],
      }),
    );
    await service.write('k', result({ providers: [] }));
    expect(setBounded).toHaveBeenCalledTimes(1);
  });
});

describe('RedisService bounded commands', () => {
  it('pass through when Redis answers', async () => {
    const client = {
      get: vi.fn().mockResolvedValue('v'),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };
    const redis = new RedisService(client as never);
    await expect(redis.getBounded('k', 50)).resolves.toBe('v');
    await redis.setBounded('k', 'v', 30, 50);
    await redis.delBounded('k', 50);
    expect(client.set).toHaveBeenCalledWith('k', 'v', 'EX', 30);
    expect(client.del).toHaveBeenCalledWith('k');
  });

  it('reject after the bound when the command never settles (offline queue)', async () => {
    const client = { get: vi.fn(() => new Promise(() => {})) };
    const redis = new RedisService(client as never);
    await expect(redis.getBounded('k', 10)).rejects.toThrow('Redis command timed out after 10ms');
  });
});

describe('breaker state across restarts (Redis)', () => {
  const trip = (health: SearchProviderHealthService, id: string): void => {
    for (let i = 0; i < SEARCH_BREAKER_FAILURE_THRESHOLD; i += 1) {
      health.recordFailure(id);
    }
  };

  it('opening writes research:breaker:<id> with the cool-down TTL; closing deletes it', async () => {
    const redis = {
      setBounded: vi.fn().mockResolvedValue(undefined),
      delBounded: vi.fn().mockResolvedValue(undefined),
    };
    const health = new SearchProviderHealthService(redis as never);

    trip(health, 'p1');
    expect(redis.setBounded).toHaveBeenCalledWith(
      'research:breaker:p1',
      expect.stringMatching(/^\d+$/u),
      SEARCH_BREAKER_COOLDOWN_MS / 1000,
      expect.any(Number),
    );
    health.recordSuccess('p1');
    expect(redis.delBounded).toHaveBeenCalledWith('research:breaker:p1', expect.any(Number));
    health.recordSuccess('p2');
    expect(redis.delBounded).toHaveBeenCalledTimes(1);
  });

  it('a fresh process treats a provider with a live Redis key as open (once per provider)', async () => {
    const openedAt = Date.now() - 1_000;
    const redis = { getBounded: vi.fn().mockResolvedValue(String(openedAt)) };
    const health = new SearchProviderHealthService(redis as never);

    await health.hydrate(['p1']);
    await health.hydrate(['p1']);

    expect(health.isOpen('p1')).toBe(true);
    expect(health.allow('p1')).toBe(false);
    expect(redis.getBounded).toHaveBeenCalledTimes(1);
  });

  it('an expired or missing key, or a Redis failure, changes nothing', async () => {
    const redis = {
      getBounded: vi
        .fn()
        .mockResolvedValueOnce(String(Date.now() - SEARCH_BREAKER_COOLDOWN_MS - 1))
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('down')),
      setBounded: vi.fn().mockRejectedValue(new Error('down')),
    };
    const health = new SearchProviderHealthService(redis as never);

    await health.hydrate(['old', 'none', 'err']);
    expect(['old', 'none', 'err'].map((id) => health.allow(id))).toEqual([true, true, true]);
    trip(health, 'x');
    expect(health.isOpen('x')).toBe(true);
  });

  it('without Redis it is memory only', async () => {
    const health = new SearchProviderHealthService();
    await health.hydrate(['p1']);
    expect(health.allow('p1')).toBe(true);
  });
});

describe('SearchExecutionService research-engine entry points', () => {
  type Built = {
    service: SearchExecutionService;
    adapterSearch: Mock;
    recordUsage: Mock;
    cache: { read: Mock; write: Mock };
    findEnabled: Mock;
  };

  const build = (
    providers: ReturnType<typeof provider>[],
    cached: SearchExecutionResult | null = null,
  ): Built => {
    const adapterSearch = vi.fn(async (_request: unknown, context: SearchAdapterContext) => {
      await context.onNetworkCall?.();
      return { results: result().results, latencyMs: 1 };
    });
    const recordUsage = vi.fn(async () => {});
    const cache = { read: vi.fn(async () => cached), write: vi.fn(async () => {}) };
    const findEnabled = vi.fn(async () => providers);
    const service = new SearchExecutionService(
      {
        findEnabled,
        findById: vi.fn(async (id: string) => providers.find((p) => p.id === id) ?? null),
      } as never,
      {
        create: vi.fn(async () => ({ id: 'run-1', userId: 'u1', providerId: providers[0]?.id })),
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
      { getAdapter: vi.fn(() => ({ search: adapterSearch })) } as never,
      { record: recordUsage } as never,
      new SearchProviderHealthService(),
      cache as never,
    );
    return { service, adapterSearch, recordUsage, cache, findEnabled };
  };

  const all = [
    provider(SearchProviderKind.EXA),
    provider(SearchProviderKind.OLLAMA_WEB),
    provider(SearchProviderKind.SERPAPI),
  ];

  it('a cache hit makes no provider call and records no unit', async () => {
    const built = build(all, { ...result(), cached: true, searchRequestCount: 0 });

    const answer = await built.service.executeCached('u1', { query: 'eu ai act' }, true);

    expect(answer.cached).toBe(true);
    expect(built.adapterSearch).not.toHaveBeenCalled();
    expect(built.recordUsage).not.toHaveBeenCalled();
    expect(built.cache.read).toHaveBeenCalledWith(
      searchCacheKey(
        'eu ai act',
        all.map((p) => p.id),
        10,
      ),
    );
  });

  it('a miss runs every provider (ADR-210), meters each call and stores the answer', async () => {
    const built = build(all);

    await built.service.executeCached('u1', { query: 'eu ai act' }, true);

    expect(built.adapterSearch).toHaveBeenCalledTimes(3);
    expect(built.recordUsage).toHaveBeenCalledTimes(3);
    await vi.waitFor(() => expect(built.cache.write).toHaveBeenCalledTimes(1));
  });

  it('an explicit provider or useCache=false bypasses the cache entirely', async () => {
    const built = build(all, result());

    await built.service.executeCached('u1', { query: 'q1', providerId: 'p-EXA' }, true);
    await built.service.executeCached('u1', { query: 'q2' }, false);

    expect(built.cache.read).not.toHaveBeenCalled();
    expect(built.cache.write).not.toHaveBeenCalled();
    expect(built.adapterSearch).toHaveBeenCalledTimes(4);
  });

  it('an expansion query runs only on expansion providers', async () => {
    const built = build(all);

    const answer = await built.service.executeExpansion('u1', { query: 'gpai fines' }, false);

    expect(answer?.attemptedProviders).toEqual(['P-OLLAMA_WEB']);
    expect(built.adapterSearch).toHaveBeenCalledTimes(1);
    expect(built.recordUsage).toHaveBeenCalledTimes(1);
  });

  it('publicConfig.expansion=true admits a paid provider; false removes a default one', async () => {
    const built = build([
      provider(SearchProviderKind.EXA, { expansion: true }),
      provider(SearchProviderKind.OLLAMA_WEB, { expansion: false }),
    ]);

    const answer = await built.service.executeExpansion('u1', { query: 'gpai fines' }, false);

    expect(answer?.attemptedProviders).toEqual(['P-EXA']);
  });

  it('no expansion provider: null, no call, no unit', async () => {
    const built = build([provider(SearchProviderKind.EXA), provider(SearchProviderKind.SERPAPI)]);

    await expect(built.service.executeExpansion('u1', { query: 'gpai' }, true)).resolves.toBeNull();
    expect(built.adapterSearch).not.toHaveBeenCalled();
    expect(built.recordUsage).not.toHaveBeenCalled();
  });

  it('expansion answers are cached under their own provider set', async () => {
    const built = build(all);

    await built.service.executeExpansion('u1', { query: 'gpai' }, true);

    expect(built.cache.read).toHaveBeenCalledWith(searchCacheKey('gpai', ['p-OLLAMA_WEB'], 10));
  });

  it('execute (POST /research/search) never touches the cache', async () => {
    const built = build(all, result());

    await built.service.execute('u1', { query: 'q' });

    expect(built.cache.read).not.toHaveBeenCalled();
    expect(built.adapterSearch).toHaveBeenCalledTimes(3);
  });
});
