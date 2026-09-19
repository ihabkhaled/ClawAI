import { type Mock, vi } from 'vitest';
import { SiteCrawlManager } from '../site-crawl.manager';
import type { ResearchProgressPublisher } from '../research-progress-publisher.service';
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
  let fetchPage: Mock;
  let manager: SiteCrawlManager;
  let trace: ResearchTraceEntry[];
  let toolsUsed: string[];
  let warnings: string[];

  beforeEach(() => {
    fetchPage = vi.fn();
    const progressPublisher = { publish: vi.fn() } as unknown as ResearchProgressPublisher;
    manager = new SiteCrawlManager({ fetchPage } as unknown as FetchService, progressPublisher);
    trace = [];
    toolsUsed = [];
    warnings = [];
  });

  it('rejects a start URL that is not a valid absolute URL without calling fetch', async () => {
    const items = await manager.crawl('u1', 'not-a-url', trace, toolsUsed, warnings, undefined);

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

    const urls = items.map((item) => item.url);
    expect(urls).toContain('https://example.com/one-sitemap-page');
    expect(urls).toContain('https://example.com/from-a-link');
    expect(urls).not.toContain('https://other-domain.com/ignored');
  });

  // Sitemap pages come first; links only fill budget the sitemap left over.
  // (It used to be one hop only, so a site without a big sitemap could never
  // yield more than a dozen pages however many were asked for.)
  it('reads sitemap pages first and follows links only with budget left', async () => {
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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
      4,
    );

    // homepage + the 3 sitemap pages fill a budget of 4: the link waits.
    expect(items.map((item) => item.url)).not.toContain(
      'https://example.com/should-not-be-fetched',
    );

    const more = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
      10,
    );
    const urls = more.map((item) => item.url);
    expect(urls).toContain('https://example.com/should-not-be-fetched');
    expect(urls.indexOf('https://example.com/should-not-be-fetched')).toBeGreaterThan(
      urls.indexOf('https://example.com/c'),
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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

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

    await manager.crawl('u1', 'https://example.com/', trace, toolsUsed, warnings, undefined);

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

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

    // 20 total (CRAWL_DEFAULT_MAX_PAGES), homepage included.
    expect(items).toHaveLength(20);
  });

  // `example.com` routinely redirects to `https://www.example.com`, and every
  // sitemap entry then carries the www host. Compared with the TYPED origin,
  // all of them were dropped and the crawl returned the homepage alone — which
  // bare-domain detection turned from an edge into the common case.
  it('follows a homepage redirect to www and still crawls the sitemap', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/') {
        return Promise.resolve(
          buildFetchResult({ url, finalUrl: 'https://www.example.com/', links: [] }),
        );
      }
      if (url === 'https://www.example.com/sitemap.xml') {
        return Promise.resolve(
          buildFetchResult({
            mimeType: 'application/xml',
            content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://www.example.com/pricing</loc></url>
              <url><loc>https://www.example.com/docs</loc></url>
            </urlset>`,
          }),
        );
      }
      if (url.endsWith('/robots.txt')) {
        return Promise.reject(new Error('not found'));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

    expect(items.map((item) => item.url)).toEqual([
      'https://www.example.com/',
      'https://www.example.com/pricing',
      'https://www.example.com/docs',
    ]);
  });

  it('still never leaves the site the user named', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url === 'https://example.com/') {
        return Promise.resolve(
          buildFetchResult({
            links: [
              'https://example.com/about',
              'https://evil.test/steal',
              'https://sub.example.com/x',
            ],
          }),
        );
      }
      if (url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml')) {
        return Promise.reject(new Error('not found'));
      }
      return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
    });

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
    );

    expect(items.map((item) => item.url)).toEqual([
      'https://example.com/',
      'https://example.com/about',
    ]);
  });

  describe('page budget and ranking', () => {
    function siteWith(paths: string[]): void {
      fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
        if (url === 'https://example.com/sitemap.xml') {
          return Promise.resolve(
            buildFetchResult({
              mimeType: 'application/xml',
              content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
                .map((path) => `<url><loc>https://example.com${path}</loc></url>`)
                .join('')}</urlset>`,
            }),
          );
        }
        if (url.endsWith('/robots.txt')) {
          return Promise.reject(new Error('not found'));
        }
        return Promise.resolve(buildFetchResult({ url, finalUrl: url }));
      });
    }

    it('reads only as many pages as the caller asked for', async () => {
      siteWith(['/a', '/b', '/c', '/d', '/e']);
      const items = await manager.crawl(
        'u1',
        'https://example.com/',
        trace,
        toolsUsed,
        warnings,
        undefined,
        3,
      );
      expect(items).toHaveLength(3);
    });

    it('never exceeds the ceiling whatever the caller asks for', async () => {
      siteWith(Array.from({ length: 60 }, (_, i) => `/p${String(i)}`));
      const items = await manager.crawl(
        'u1',
        'https://example.com/',
        trace,
        toolsUsed,
        warnings,
        undefined,
        500,
      );
      expect(items.length).toBeLessThanOrEqual(200);
    });

    // Sitemaps are in document order, so on a big site the page the question
    // was about used to fall outside the budget entirely.
    it('reads the pages the question is about first', async () => {
      siteWith(['/blog/one', '/blog/two', '/about', '/pricing']);
      const items = await manager.crawl(
        'u1',
        'https://example.com/',
        trace,
        toolsUsed,
        warnings,
        undefined,
        2,
        'what is their pricing',
      );
      expect(items.map((item) => item.url)).toEqual([
        'https://example.com/',
        'https://example.com/pricing',
      ]);
    });
  });

  // A site with no sitemap at all used to stop at its homepage's own links.
  it('follows links hop by hop to fill a large budget on a site with no sitemap', async () => {
    fetchPage.mockImplementation((_userId: string, { url }: { url: string }) => {
      if (url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml')) {
        return Promise.reject(new Error('not found'));
      }
      // every page links to two deeper pages: /p -> /p0, /p1 -> /p00, /p01 ...
      const path = new URL(url).pathname.replace(/\/$/u, '') || '/p';
      return Promise.resolve(
        buildFetchResult({
          url,
          finalUrl: url,
          links: [`https://example.com${path}0`, `https://example.com${path}1`],
        }),
      );
    });

    const items = await manager.crawl(
      'u1',
      'https://example.com/',
      trace,
      toolsUsed,
      warnings,
      undefined,
      12,
    );

    expect(items).toHaveLength(12);
    expect(new Set(items.map((item) => item.url)).size).toBe(12);
  });
});
