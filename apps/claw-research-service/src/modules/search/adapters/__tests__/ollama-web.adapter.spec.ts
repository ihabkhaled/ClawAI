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

  it('healthCheck falls back to Bing RSS when Ollama Web returns 401', async () => {
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
          <html>
            <body>
              <a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent('https://example.com/a')}">A</a>
              <a class="result__snippet">Snippet A</a>
              <a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent('https://example.com/b')}">B</a>
              <a class="result__snippet">Snippet B</a>
            </body>
          </html>`,
      });

    const response = await adapter.search({ query: 'q', maxResults: 2 }, context);

    expect(response.results).toHaveLength(2);
    expect(response.results[0]?.url).toBe('https://example.com/a');
    expect(response.results[1]?.url).toBe('https://example.com/b');
    expect(response.results[0]?.snippet).toBe('Snippet A');
  });

  it('falls back when Ollama Web results are weakly matched to the query', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'Recycle Bin help in Windows',
              url: 'https://support.microsoft.com/recycle-bin',
              content: 'Find the recycle bin icon in Windows.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <html>
            <body>
              <a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent('https://learn.microsoft.com/windows/release-health/status-windows-11-24h2')}">Known issues in Windows 11, version 24H2</a>
              <a class="result__snippet">Current known issues for Windows 11, version 24H2.</a>
            </body>
          </html>`,
      });

    const response = await adapter.search(
      { query: 'Windows 11 24H2 known issues', maxResults: 5 },
      context,
    );

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.title).toContain('24H2');
    expect(response.warnings ?? []).toHaveLength(0);
  });

  it('withholds evidence when both providers return weakly matched results', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'Recycle Bin help in Windows',
              url: 'https://support.microsoft.com/recycle-bin',
              content: 'Find the recycle bin icon in Windows.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `
          <html>
            <body>
              <a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent('https://support.microsoft.com/windows')}">Windows help and learning</a>
              <a class="result__snippet">Find help and learning resources for Windows.</a>
            </body>
          </html>`,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <item>
                <title>Windows help and learning</title>
                <link>https://support.microsoft.com/windows</link>
                <description>Find help and learning resources for Windows.</description>
              </item>
            </channel>
          </rss>`,
      });

    const response = await adapter.search(
      { query: 'Windows 11 24H2 known issues', maxResults: 5 },
      context,
    );

    expect(response.results).toHaveLength(0);
    expect(response.warnings?.[0]).toMatch(/withheld/i);
  });
});
