import { vi } from 'vitest';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { Crawl4AiFetchAdapter } from '../crawl4ai-fetch.adapter';
import { FirecrawlFetchAdapter } from '../firecrawl-fetch.adapter';
import { FlareSolverrFetchAdapter } from '../flaresolverr-fetch.adapter';

function jsonResponse(payload: unknown, status = 200): Record<string, unknown> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return {
    ok: status >= 200 && status < 300,
    status,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

const ARTICLE =
  '<html><head><title>Sidecar page</title></head><body><p>Rendered by a sidecar</p></body></html>';

function lastRequest(): { url: string; body: Record<string, unknown> } {
  const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
    string,
    { body: string },
  ];
  return { url, body: JSON.parse(init.body) as Record<string, unknown> };
}

describe('sidecar fetch adapters', () => {
  describe('Crawl4AiFetchAdapter', () => {
    it('posts to /crawl on the internal default and extracts the returned HTML', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          results: [
            { url: 'https://example.com/', success: true, status_code: 200, html: ARTICLE },
          ],
        }),
      );

      const result = await new Crawl4AiFetchAdapter().fetchPage({ url: 'https://example.com/' });

      expect(lastRequest().url).toBe('http://crawl4ai:11235/crawl');
      expect(lastRequest().body['urls']).toEqual(['https://example.com/']);
      expect(result.title).toBe('Sidecar page');
      expect(result.content).toContain('Rendered by a sidecar');
      expect(new Crawl4AiFetchAdapter().kind).toBe(FetchStrategyKind.CRAWL4AI);
    });

    it('refuses a page whose final URL landed on a private host', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          results: [
            {
              url: 'https://example.com/',
              success: true,
              status_code: 200,
              html: ARTICLE,
              redirected_url: 'http://10.1.2.3/',
            },
          ],
        }),
      );

      await expect(
        new Crawl4AiFetchAdapter().fetchPage({ url: 'https://example.com/' }),
      ).rejects.toThrow();
    });

    it('never sends a private target to the sidecar', async () => {
      global.fetch = vi.fn();

      await expect(
        new Crawl4AiFetchAdapter().fetchPage({ url: 'http://127.0.0.1/' }),
      ).rejects.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('throws when Crawl4AI reports failure', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: true, results: [{ success: false, error_message: 'timeout' }] }),
        );

      await expect(
        new Crawl4AiFetchAdapter().fetchPage({ url: 'https://example.com/' }),
      ).rejects.toThrow(/timeout/u);
    });
  });

  describe('FlareSolverrFetchAdapter', () => {
    it('sends request.get to /v1 and uses the solved page', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({
            status: 'ok',
            solution: { url: 'https://example.com/', status: 200, response: ARTICLE },
          }),
        );

      const result = await new FlareSolverrFetchAdapter().fetchPage({
        url: 'https://example.com/',
        strategyConfig: { baseUrl: 'http://flaresolverr:8191' },
      });

      expect(lastRequest().url).toBe('http://flaresolverr:8191/v1');
      expect(lastRequest().body).toMatchObject({ cmd: 'request.get', url: 'https://example.com/' });
      expect(result.content).toContain('Rendered by a sidecar');
    });

    it('throws when FlareSolverr could not solve the page', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ status: 'error', message: 'Challenge not solved' }));

      await expect(
        new FlareSolverrFetchAdapter().fetchPage({ url: 'https://example.com/' }),
      ).rejects.toThrow(/Challenge not solved/u);
    });
  });

  describe('FirecrawlFetchAdapter', () => {
    it('posts to /v2/scrape and falls back to Markdown when no HTML came back', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: {
            markdown: '# From Firecrawl',
            metadata: { title: 'FC', statusCode: 200, url: 'https://example.com/' },
          },
        }),
      );

      const result = await new FirecrawlFetchAdapter().fetchPage({ url: 'https://example.com/' });

      expect(lastRequest().url).toBe('http://firecrawl-api:3002/v2/scrape');
      expect(result.content).toBe('# From Firecrawl');
      expect(result.mimeType).toBe('text/markdown');
      expect(result.title).toBe('FC');
    });

    it('throws when the sidecar answers non-2xx', async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 503));

      await expect(
        new FirecrawlFetchAdapter().fetchPage({ url: 'https://example.com/' }),
      ).rejects.toThrow(/HTTP 503/u);
    });

    it('refuses a metadata-host base URL whatever the config says', async () => {
      global.fetch = vi.fn();

      await expect(
        new FirecrawlFetchAdapter().fetchPage({
          url: 'https://example.com/',
          strategyConfig: { baseUrl: 'http://169.254.169.254' },
        }),
      ).rejects.toThrow(/metadata host/u);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
