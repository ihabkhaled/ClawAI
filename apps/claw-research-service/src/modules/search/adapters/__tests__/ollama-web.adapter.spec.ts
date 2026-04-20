import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { OllamaWebSearchAdapter } from '../ollama-web.adapter';
import { runSearchAdapterContract } from './search-adapter-contract';

global.fetch = jest.fn();

describe('OllamaWebSearchAdapter', () => {
  runSearchAdapterContract(() => new OllamaWebSearchAdapter());

  const adapter = new OllamaWebSearchAdapter();
  const context = {
    baseUrl: 'https://ollama.com',
    credentials: {},
    publicConfig: {},
    timeoutMs: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('healthCheck returns healthy on 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    const result = await adapter.healthCheck(context);
    expect(result.healthy).toBe(true);
  });

  it('healthCheck returns unhealthy on 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    const result = await adapter.healthCheck(context);
    expect(result.healthy).toBe(false);
    expect(result.errorMessage).toContain('401');
  });

  it('search normalizes results and assigns descending scores', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: 'A', url: 'https://x.com/a', content: 'sa' },
          { title: 'B', url: 'https://x.com/b', content: 'sb' },
          { title: 'C', url: 'https://x.com/c', content: 'sc' },
        ],
      }),
    });
    const response = await adapter.search({ query: 'q', maxResults: 3 }, context);
    expect(response.results).toHaveLength(3);
    expect(response.results[0]?.providerKind).toBe(SearchProviderKind.OLLAMA_WEB);
    const scores = response.results.map((r) => r.score);
    expect(scores[0]).toBeGreaterThan(scores[1] ?? 0);
    expect(scores[1]).toBeGreaterThan(scores[2] ?? 0);
  });
});
