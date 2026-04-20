import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { TavilyAdapter } from '../tavily.adapter';
import { runSearchAdapterContract } from './search-adapter-contract';

global.fetch = jest.fn();

describe('TavilyAdapter', () => {
  runSearchAdapterContract(() => new TavilyAdapter());

  const adapter = new TavilyAdapter();
  const context = {
    baseUrl: 'https://api.tavily.com',
    credentials: { apiKey: 'k' },
    publicConfig: {},
    timeoutMs: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('healthCheck returns unhealthy when apiKey is missing', async () => {
    const result = await adapter.healthCheck({
      ...context,
      credentials: {},
    });
    expect(result.healthy).toBe(false);
    expect(result.errorMessage).toContain('apiKey');
  });

  it('healthCheck returns healthy on 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    const result = await adapter.healthCheck(context);
    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('search normalizes Tavily results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: 'q',
        results: [
          {
            title: 'A',
            url: 'https://example.com/a',
            content: 'snippet',
            published_date: '2025-01-01',
            score: 0.9,
          },
        ],
      }),
    });
    const response = await adapter.search({ query: 'q', maxResults: 5 }, context);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.providerKind).toBe(SearchProviderKind.TAVILY);
    expect(response.results[0]?.title).toBe('A');
    expect(response.results[0]?.score).toBe(0.9);
  });

  it('search throws without apiKey', async () => {
    await expect(
      adapter.search({ query: 'q', maxResults: 5 }, { ...context, credentials: {} }),
    ).rejects.toThrow(/apiKey/);
  });

  it('search throws on non-2xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    await expect(adapter.search({ query: 'q', maxResults: 5 }, context)).rejects.toThrow(/500/);
  });
});
