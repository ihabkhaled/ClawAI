import { AppConfig } from '../../../../app/config/app.config';
import { HttpFetchAdapter } from '../http-fetch.adapter';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn() },
}));

/**
 * `fetchPage` had no test coverage at all before this — `FetchService`'s own
 * tests mock the adapter entirely. Extending its output with `metadata`
 * (canonical/hreflang/OG/JSON-LD, section 13 of the web-intelligence spec)
 * is the first real change to what it returns, so this closes that gap
 * rather than adding an untested field on top of an untested method.
 */
describe('HttpFetchAdapter.fetchPage', () => {
  const appConfigGet = AppConfig.get as jest.Mock;
  let adapter: HttpFetchAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    appConfigGet.mockReturnValue({ RESEARCH_DOMAIN_ALLOWLIST: [] });
    adapter = new HttpFetchAdapter();
  });

  function mockHtmlResponse(html: string): void {
    const body = Buffer.from(html, 'utf8');
    let sent = false;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example.com/',
      redirected: false,
      headers: { get: () => 'text/html; charset=utf-8' },
      body: {
        getReader: () => ({
          read: () =>
            sent
              ? Promise.resolve({ done: true, value: undefined })
              : ((sent = true), Promise.resolve({ done: false, value: body })),
        }),
      },
    });
  }

  it('populates metadata for an HTML response', async () => {
    mockHtmlResponse(`
      <html><head>
        <title>ClawAI</title>
        <meta name="description" content="One subscription, every model">
        <link rel="canonical" href="https://example.com/">
        <meta property="og:title" content="ClawAI">
      </head><body>hello</body></html>
    `);

    const result = await adapter.fetchPage({ url: 'https://example.com/' });

    expect(result.title).toBe('ClawAI');
    expect(result.metadata).toEqual({
      description: 'One subscription, every model',
      robotsDirective: null,
      canonicalUrl: 'https://example.com/',
      hreflangAlternates: [],
      openGraph: { title: 'ClawAI' },
      twitterCard: {},
      jsonLd: [],
      feedUrls: [],
    });
  });

  it('leaves metadata undefined for a non-HTML response', async () => {
    let sent = false;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example.com/data.json',
      redirected: false,
      headers: { get: () => 'application/json' },
      body: {
        getReader: () => ({
          read: () =>
            sent
              ? Promise.resolve({ done: true, value: undefined })
              : ((sent = true),
                Promise.resolve({ done: false, value: Buffer.from('{"a":1}', 'utf8') })),
        }),
      },
    });

    const result = await adapter.fetchPage({ url: 'https://example.com/data.json' });

    expect(result.metadata).toBeUndefined();
  });
});
