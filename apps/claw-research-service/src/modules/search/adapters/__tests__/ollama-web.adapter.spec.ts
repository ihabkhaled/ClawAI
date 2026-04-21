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

  it('healthCheck falls back to DuckDuckGo when Ollama Web returns 401', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await adapter.healthCheck(context);
    expect(result.healthy).toBe(true);
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

  it('search falls back to DuckDuckGo HTML when Ollama Web is unauthorized', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa">A</a>
          <a class="result__snippet">Snippet A</a>
          <a class="result__a" href="https://example.com/b">B</a>
          <a class="result__snippet">Snippet B</a>
        `,
      });

    const response = await adapter.search({ query: 'q', maxResults: 2 }, context);

    expect(response.results).toHaveLength(2);
    expect(response.results[0]?.url).toBe('https://example.com/a');
    expect(response.results[1]?.url).toBe('https://example.com/b');
    expect(response.results[0]?.snippet).toBe('Snippet A');
  });
});
