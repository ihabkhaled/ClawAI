import { SiteCrawlManager } from '../site-crawl.manager';
import type { FetchService } from '../../../fetch/services/fetch.service';
import type { FetchResult } from '../../../fetch/types/fetch.types';
import type { ResearchTraceEntry } from '../../types/evidence-bundle.types';

function buildFetchResult(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    httpStatus: 200,
    mimeType: 'text/html',
    title: 'Example',
    content: 'Example homepage content',
    links: [],
    byteSize: 100,
    cacheHit: false,
    latencyMs: 5,
    ...overrides,
  };
}

/**
 * A production-grade multi-page crawl was section 8 of the web-intelligence
 * spec — the biggest confirmed-missing piece from the intake audit. Every
 * fetch here goes through the same mocked `FetchService.fetchPage`, since
 * that is the ONLY thing this manager is allowed to use to reach the
 * network (rule 41 item 12: no second fetch path).
 */
describe('SiteCrawlManager', () => {
  let fetchPage: jest.Mock;
  let manager: SiteCrawlManager;
  let trace: ResearchTraceEntry[];
  let toolsUsed: string[];
  let warnings: string[];

  beforeEach(() => {
    fetchPage = jest.fn();
    manager = new SiteCrawlManager({ fetchPage } as unknown as FetchService);
    trace = [];
    toolsUsed = [];
    warnings = [];
  });

  it('rejects a start URL that is not a valid absolute URL without calling fetch', async () => {
    const items = await manager.crawl('u1', 'not-a-url', trace, toolsUsed, warnings);

    expect(items).toEqual([]);
    expect(fetchPage).not.toHaveBeenCalled();
    expect(warnings[0]).toContain('not-a-url');
  });

  it('crawls only the homepage when there is no robots.txt and no sitemap', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    expect(items).toHaveLength(1);
    expect(items[0]?.url).toBe('https://example.com/');
    expect(items[0]?.source).toBe('fetch');
    expect(toolsUsed).toContain('web_fetch');
    expect(toolsUsed).not.toContain('web_fetch:site_crawl');
  });

  it('discovers pages from a sitemap declared in robots.txt', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'text/plain',
            content: 'User-agent: *\nDisallow:\nSitemap: https://example.com/my-sitemap.xml',
          }),
        );
      }
      if (url === 'https://example.com/my-sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/</loc></url>
              <url><loc>https://example.com/about</loc></url>
              <url><loc>https://example.com/pricing</loc></url>
              <url><loc>https://example.com/docs</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url, title: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    const urls = items.map((item) => item.url);
    expect(urls).toEqual([
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/pricing',
      'https://example.com/docs',
    ]);
    expect(toolsUsed).toContain('web_crawl:robots');
    expect(toolsUsed).toContain('web_crawl:sitemap');
    expect(toolsUsed).toContain('web_fetch:site_crawl');
  });

  it('follows a sitemap index into its nested sitemaps', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <sitemap><loc>https://example.com/sitemap-a.xml</loc></sitemap>
            </sitemapindex>`,
          }),
        );
      }
      if (url === 'https://example.com/sitemap-a.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/nested-page</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    expect(items.map((item) => item.url)).toEqual([
      'https://example.com/',
      'https://example.com/nested-page',
    ]);
  });

  it('supplements from homepage links when the sitemap has too few URLs', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/one-sitemap-page</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(
          buildFetchResult({
            links: ['https://example.com/from-a-link', 'https://other-domain.com/ignored'],
          }),
        );
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    const urls = items.map((item) => item.url);
    expect(urls).toContain('https://example.com/one-sitemap-page');
    expect(urls).toContain('https://example.com/from-a-link');
    expect(urls).not.toContain('https://other-domain.com/ignored');
  });

  it('does not fall back to homepage links when the sitemap already has enough URLs', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/a</loc></url>
              <url><loc>https://example.com/b</loc></url>
              <url><loc>https://example.com/c</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(
          buildFetchResult({ links: ['https://example.com/should-not-be-fetched'] }),
        );
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    expect(items.map((item) => item.url)).not.toContain(
      'https://example.com/should-not-be-fetched',
    );
  });

  it('skips a page disallowed by robots.txt and warns about it', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'text/plain',
            content: 'User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/sitemap.xml',
          }),
        );
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/admin/secret</loc></url>
              <url><loc>https://example.com/public-page</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    const urls = items.map((item) => item.url);
    expect(urls).not.toContain('https://example.com/admin/secret');
    expect(urls).toContain('https://example.com/public-page');
    expect(fetchPage).not.toHaveBeenCalledWith('u1', { url: 'https://example.com/admin/secret' });
    expect(warnings.some((w) => w.includes('robots.txt'))).toBe(true);
  });

  it('does not let one failed page abort the rest of the crawl', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://example.com/broken</loc></url>
              <url><loc>https://example.com/fine</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      if (url === 'https://example.com/broken') {
        return Promise.reject(new Error('500 Internal Server Error'));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    const urls = items.map((item) => item.url);
    expect(urls).toContain('https://example.com/fine');
    expect(urls).not.toContain('https://example.com/broken');
    expect(warnings.some((w) => w.includes('broken'))).toBe(true);
  });

  it('returns no evidence when even the homepage fails to fetch', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/') {
        return Promise.reject(new Error('connection refused'));
      }
      return Promise.reject(new Error('404'));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    expect(items).toEqual([]);
    expect(warnings.some((w) => w.includes('connection refused'))).toBe(true);
  });

  it('discovers pages from a feed the homepage advertises via autodiscovery', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(
          buildFetchResult({
            links: [],
            metadata: {
              description: null,
              robotsDirective: null,
              canonicalUrl: null,
              hreflangAlternates: [],
              openGraph: {},
              twitterCard: {},
              jsonLd: [],
              feedUrls: ['https://example.com/feed.xml'],
            },
          }),
        );
      }
      if (url === 'https://example.com/feed.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/rss+xml',
            content: `<rss version="2.0"><channel>
              <item><title>Latest Post</title><link>https://example.com/latest-post</link></item>
            </channel></rss>`,
          }),
        );
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    expect(items.map((item) => item.url)).toContain('https://example.com/latest-post');
    expect(toolsUsed).toContain('web_crawl:feed');
  });

  it('does not crawl a feed when the homepage advertises none', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt' || url === 'https://example.com/sitemap.xml') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    expect(fetchPage).not.toHaveBeenCalledWith('u1', { url: 'https://example.com/feed.xml' });
    expect(toolsUsed).not.toContain('web_crawl:feed');
  });

  it('caps total pages fetched at the crawl page budget', async () => {
    const sitemapUrls = Array.from(
      { length: 30 },
      (_, i) => `<url><loc>https://example.com/page-${String(i)}</loc></url>`,
    ).join('\n');
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/robots.txt') {
        return Promise.reject(new Error('404'));
      }
      if (url === 'https://example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls}</urlset>`,
          }),
        );
      }
      if (url === 'https://example.com/') {
        return Promise.resolve(buildFetchResult({ links: [] }));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings);

    // 20 total (CRAWL_DEFAULT_MAX_PAGES), homepage included.
    expect(items).toHaveLength(20);
  });
});
