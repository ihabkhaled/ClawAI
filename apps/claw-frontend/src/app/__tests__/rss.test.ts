import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;
const mockListPublicChatRssEntries = vi.fn();

vi.mock('@/lib/chat-shares/public-chat-share.service', () => ({
  listPublicChatRssEntries: (locale: string): unknown => mockListPublicChatRssEntries(locale),
}));

// The per-locale feeds take their language from a request header, so a reader
// who subscribes to one of them gets a single language and never learns the
// other twelve exist. /rss.xml is the fixed, negotiation-free URL that carries
// every public page and every public chat, in every locale, at once.
describe('global rss feed', () => {
  beforeEach(() => {
    vi.resetModules();
    mockListPublicChatRssEntries.mockReset();
    mockListPublicChatRssEntries.mockResolvedValue([]);
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = 'https://claw.example';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  it('is rendered at request time so production runtime configuration controls discovery', async () => {
    const route = await import('../rss.xml/route');
    expect(route.dynamic).toBe('force-dynamic');
  });

  it(
    'carries every locale, not just the default one',
    async () => {
      const { GET } = await import('../rss.xml/route');

      const xml = await (await GET(new Request('https://claw.example/rss.xml'))).text();

      for (const locale of [
        'en',
        'ar',
        'de',
        'es',
        'fa',
        'fr',
        'hi',
        'it',
        'ja',
        'pt',
        'ru',
        'th',
      ]) {
        expect(xml).toContain(`<link>https://claw.example/${locale}/about</link>`);
      }
      // zh is served as zh-Hans in language tags but keeps its bare URL prefix.
      expect(xml).toContain('<link>https://claw.example/zh/about</link>');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'labels each item with its own language instead of claiming one for the channel',
    async () => {
      const { GET } = await import('../rss.xml/route');

      const xml = await (await GET(new Request('https://claw.example/rss.xml'))).text();

      expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
      expect(xml).toContain('<dc:language>ar</dc:language>');
      expect(xml).toContain('<dc:language>zh-Hans</dc:language>');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'excludes public chat shares while the AdSense review lockdown is on, without calling the chat feed at all',
    async () => {
      mockListPublicChatRssEntries.mockImplementation((locale: string) =>
        Promise.resolve(
          locale === 'de'
            ? [
                {
                  publicShareId: 'share-abc',
                  contentLocale: 'de',
                  title: 'Ein geteilter Chat',
                  description: 'Zusammenfassung',
                  publishedAt: '2026-08-20T10:00:00.000Z',
                },
              ]
            : [],
        ),
      );
      const { GET } = await import('../rss.xml/route');

      const xml = await (await GET(new Request('https://claw.example/rss.xml'))).text();

      expect(xml).not.toContain('/share/chat/');
      expect(xml).not.toContain('<category>public-chat</category>');
      expect(mockListPublicChatRssEntries).not.toHaveBeenCalled();
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'resumes including public chat shares once the review lockdown is lifted',
    async () => {
      vi.doMock('@/constants/chat-share-review-lockdown.constants', () => ({
        CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED: false,
      }));
      mockListPublicChatRssEntries.mockImplementation((locale: string) =>
        Promise.resolve(
          locale === 'de'
            ? [
                {
                  publicShareId: 'share-abc',
                  contentLocale: 'de',
                  title: 'Ein geteilter Chat',
                  description: 'Zusammenfassung',
                  publishedAt: '2026-08-20T10:00:00.000Z',
                },
              ]
            : [],
        ),
      );
      const { GET } = await import('../rss.xml/route');

      const xml = await (await GET(new Request('https://claw.example/rss.xml'))).text();

      expect(xml).toContain('https://claw.example/de/share/chat/share-abc');
      expect(xml).toContain('<category>public-chat</category>');

      vi.doUnmock('@/constants/chat-share-review-lockdown.constants');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // One locale's chat feed failing must not cost the other twelve, and must
  // never cost the registry pages, which need no upstream at all. Verified
  // with the AdSense review lockdown lifted: while it is on, the chat feed is
  // never called at all, so it cannot degrade — see the lockdown test below.
  it(
    'still serves every page when a locale chat feed is unavailable',
    async () => {
      vi.doMock('@/constants/chat-share-review-lockdown.constants', () => ({
        CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED: false,
      }));
      mockListPublicChatRssEntries.mockImplementation((locale: string) =>
        Promise.resolve(locale === 'ja' ? null : []),
      );
      const { GET } = await import('../rss.xml/route');

      const response = await GET(new Request('https://claw.example/rss.xml'));
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Claw-Discovery-Degraded')).toBe('chat-feed-unavailable');
      expect(xml).toContain('https://claw.example/ja/about');

      vi.doUnmock('@/constants/chat-share-review-lockdown.constants');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'cannot be degraded by the chat feed while the AdSense review lockdown is on, since it is never called',
    async () => {
      mockListPublicChatRssEntries.mockImplementation(() => Promise.resolve(null));
      const { GET } = await import('../rss.xml/route');

      const response = await GET(new Request('https://claw.example/rss.xml'));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Claw-Discovery-Degraded')).toBeNull();
      expect(mockListPublicChatRssEntries).not.toHaveBeenCalled();
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // RSS_GLOBAL_MAX_ITEMS truncates the MERGED list, and a naive sort-by-date
  // merge would put chats first: chats carry live publication timestamps,
  // pages carry a fixed editorial `lastReviewed` date, so a chat dated far in
  // the future sorts ahead of every page. `buildGlobalRssResponse` instead
  // places all pages ahead of all chats before slicing, so a cap can only
  // ever drop chats — never the durable, indexable pages. `buildRssXml`
  // renders `<item>` elements in array order (see `xml.utility.ts`), so the
  // ordering guarantee is directly observable as document order: every page
  // link must appear in the xml before the first chat item does.
  it(
    'keeps every registry page ahead of chats in document order, even when chats are dated later',
    async () => {
      // Ordering is a property of the merge logic, independent of the AdSense
      // review lockdown — verified here with the lockdown lifted so chat
      // entries actually reach the merge to be ordered.
      vi.doMock('@/constants/chat-share-review-lockdown.constants', () => ({
        CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED: false,
      }));
      const FAR_FUTURE_PUBLISHED_AT = '2099-01-01T00:00:00.000Z';
      mockListPublicChatRssEntries.mockImplementation((locale: string) =>
        Promise.resolve([
          {
            publicShareId: `future-${locale}`,
            contentLocale: locale,
            title: `Future chat ${locale}`,
            description: 'Dated far ahead of every page lastReviewed date.',
            publishedAt: FAR_FUTURE_PUBLISHED_AT,
          },
        ]),
      );
      const { GET } = await import('../rss.xml/route');

      const xml = await (await GET(new Request('https://claw.example/rss.xml'))).text();

      const firstChatIndex = xml.indexOf('<category>public-chat</category>');
      expect(firstChatIndex).toBeGreaterThan(-1);
      for (const locale of [
        'en',
        'ar',
        'de',
        'es',
        'fa',
        'fr',
        'hi',
        'it',
        'ja',
        'pt',
        'ru',
        'th',
      ]) {
        const pageIndex = xml.indexOf(`<link>https://claw.example/${locale}/about</link>`);
        expect(pageIndex).toBeGreaterThan(-1);
        expect(pageIndex).toBeLessThan(firstChatIndex);
      }

      vi.doUnmock('@/constants/chat-share-review-lockdown.constants');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'answers a matching If-None-Match with 304 rather than the whole document',
    async () => {
      const { GET } = await import('../rss.xml/route');

      const first = await GET(new Request('https://claw.example/rss.xml'));
      const etag = first.headers.get('ETag');
      expect(etag).not.toBeNull();

      const second = await GET(
        new Request('https://claw.example/rss.xml', {
          headers: { 'if-none-match': etag ?? '' },
        }),
      );

      expect(second.status).toBe(304);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // Chrome renders every `application/rss+xml` response as source and never
  // applies a stylesheet to it, so a person opening the feed saw the same
  // unreadable wall of text the sitemaps used to show. Readers keep the
  // canonical feed type; a browser navigation gets XML it will style.
  it(
    'answers a feed reader with the feed type and a browser with styleable xml',
    async () => {
      const { GET } = await import('../rss.xml/route');

      const reader = await GET(
        new Request('https://claw.example/rss.xml', {
          headers: { accept: 'application/rss+xml, application/xml' },
        }),
      );
      const browser = await GET(
        new Request('https://claw.example/rss.xml', {
          headers: { accept: 'text/html,application/xhtml+xml' },
        }),
      );

      expect(reader.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
      expect(browser.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
      expect(await reader.text()).toEqual(await browser.text());
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'serves nothing at all when the deployment is globally noindex',
    async () => {
      delete process.env['SITE_URL'];
      const { GET } = await import('../rss.xml/route');

      const response = await GET(new Request('https://claw.example/rss.xml'));

      expect(response.status).toBe(404);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
