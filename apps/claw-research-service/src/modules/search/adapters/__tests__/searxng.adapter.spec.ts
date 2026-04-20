import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearxngAdapter } from '../searxng.adapter';
import { runSearchAdapterContract } from './search-adapter-contract';

global.fetch = jest.fn();

describe('SearxngAdapter', () => {
  runSearchAdapterContract(() => new SearxngAdapter());

  const adapter = new SearxngAdapter();
  const context = {
    baseUrl: 'https://searxng.example/',
    credentials: {},
    publicConfig: {},
    timeoutMs: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('search normalizes SearXNG results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: 'q',
        results: [
          { title: 'A', url: 'https://x.com/a', content: 'sa' },
          { title: 'B', url: 'https://x.com/b', content: 'sb' },
        ],
      }),
    });
    const response = await adapter.search({ query: 'q', maxResults: 5 }, context);
    expect(response.results[0]?.providerKind).toBe(SearchProviderKind.SEARXNG);
  });

  it('health on 5xx returns unhealthy', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 502 });
    const result = await adapter.healthCheck(context);
    expect(result.healthy).toBe(false);
    expect(result.errorMessage).toContain('502');
  });

  it('search throws when baseUrl is empty', async () => {
    await expect(
      adapter.search({ query: 'q', maxResults: 5 }, { ...context, baseUrl: '' }),
    ).rejects.toThrow(/baseUrl/);
  });
});
