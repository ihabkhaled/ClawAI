import { vi, type Mock } from 'vitest';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { type BusinessException } from '../../../../common/errors/business.exception';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { SearchExecutionService } from '../search-execution.service';
import type { SearchAdapterFactory } from '../../adapters/search-adapter.factory';
import type { SearchProviderRepository } from '../../repositories/search-provider.repository';
import type { SearchRunRepository } from '../../repositories/search-run.repository';
import type { SearchProviderService } from '../search-provider.service';
import type { SearchAdapterContext } from '../../types/search.types';

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
    ...overrides,
  });

  const context: SearchAdapterContext = {
    baseUrl: 'https://api.example.com',
    credentials: { apiKey: 'secret' },
    publicConfig: {},
    timeoutMs: 5000,
  };

  let providerRepository: {
    findById: Mock;
    findEnabled: Mock;
  };
  let runRepository: {
    create: Mock;
    update: Mock;
    findById: Mock;
    listByUser: Mock;
  };
  let providerService: {
    buildContext: Mock;
  };
  let adapterFactory: {
    getAdapter: Mock;
  };
  let service: SearchExecutionService;
  let recordUsage: Mock;

  beforeEach(() => {
    providerRepository = {
      findById: vi.fn(),
      findEnabled: vi.fn(),
    };
    runRepository = {
      create: vi.fn(async () => ({ id: 'run-1', userId: 'user-1' })),
      update: vi.fn(async () => ({})),
      findById: vi.fn(),
      listByUser: vi.fn(),
    };
    providerService = {
      buildContext: vi.fn(() => context),
    };
    adapterFactory = {
      getAdapter: vi.fn(),
    };

    recordUsage = vi.fn(async () => {});
    service = new SearchExecutionService(
      providerRepository as unknown as SearchProviderRepository,
      runRepository as unknown as SearchRunRepository,
      providerService as unknown as SearchProviderService,
      adapterFactory as unknown as SearchAdapterFactory,
      { record: recordUsage } as never,
    );
  });

  it('uses provider ranking for auto mode and falls back to the next provider on failure', async () => {
    const firecrawl = buildProvider({
      id: 'provider-firecrawl',
      name: 'Firecrawl',
      kind: SearchProviderKind.FIRECRAWL,
    });
    const exa = buildProvider({ id: 'provider-exa', name: 'Exa', kind: SearchProviderKind.EXA });
    providerRepository.findEnabled.mockResolvedValue([exa, firecrawl]);

    const firecrawlAdapter = {
      search: vi.fn(async (_request, adapterContext: SearchAdapterContext) => {
        await adapterContext.onNetworkCall?.();
        throw new Error('timeout');
      }),
    };
    const exaAdapter = {
      search: vi.fn(async (_request, adapterContext: SearchAdapterContext) => {
        await adapterContext.onNetworkCall?.();
        return {
          results: [
            {
              id: 'r1',
              title: 'Doc',
              url: 'https://example.com/doc',
              snippet: 'Snippet',
              publishedAt: null,
              freshness: null,
              score: 0.8,
              providerKind: SearchProviderKind.EXA,
            },
          ],
          latencyMs: 42,
        };
      }),
    };
    adapterFactory.getAdapter.mockImplementation((kind: SearchProviderKind) => {
      if (kind === SearchProviderKind.FIRECRAWL) {
        return firecrawlAdapter;
      }
      return exaAdapter;
    });

    const result = await service.execute('user-1', {
      query: 'latest docs',
      filters: { researchWorkflow: 'SEARCH_FETCH_EXTRACT' },
    });

    expect(result.providerId).toBe('provider-exa');
    expect(result.selectionMode).toBe('auto');
    expect(result.fallbackUsed).toBe(true);
    expect(result.attemptedProviders).toEqual(['Firecrawl', 'Exa']);
    expect(result.searchRequestCount).toBe(2);
    expect(recordUsage.mock.calls).toEqual([
      ['user-1', 'WEB_SEARCH', 'run-1:provider-firecrawl:1'],
      ['user-1', 'WEB_SEARCH', 'run-1:provider-exa:2'],
    ]);
    // No "fallback chain" line any more: providers are queried in PARALLEL, so
    // nothing fell back to anything. The fact that matters — the preferred
    // provider is broken — is still reported, and fallbackUsed above still
    // says the primary did not answer.
    expect(result.warnings).toEqual(expect.arrayContaining(['Provider Firecrawl failed: timeout']));
  });

  it('honors an explicit provider selection', async () => {
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
        return { results: [], latencyMs: 10 };
      }),
    });

    const result = await service.execute('user-1', {
      providerId: 'provider-brave',
      query: 'weather',
    });

    expect(result.providerId).toBe('provider-brave');
    expect(result.selectionMode).toBe('explicit');
    expect(result.fallbackUsed).toBe(false);
    expect(result.attemptedProviders).toEqual(['Brave']);
    expect(result.searchRequestCount).toBe(2);
    expect(recordUsage.mock.calls).toEqual([
      ['user-1', 'WEB_SEARCH', 'run-1:provider-brave:1'],
      ['user-1', 'WEB_SEARCH', 'run-1:provider-brave:2'],
    ]);
  });

  it('fails with NO_ENABLED_PROVIDER when auto mode has no providers', async () => {
    providerRepository.findEnabled.mockResolvedValue([]);

    await expect(
      service.execute('user-1', {
        query: 'hello',
      }),
    ).rejects.toMatchObject<Partial<BusinessException>>({
      code: ResearchErrorCode.NO_ENABLED_PROVIDER,
    });
  });
});
