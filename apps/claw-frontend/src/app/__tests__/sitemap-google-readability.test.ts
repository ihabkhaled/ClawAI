import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRIVATE_ROUTE_PREFIXES } from '@/constants';
import { SITEMAP_URL_CHUNK_SIZE } from '@/constants/seo-discovery.constants';

const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;
const SITE = 'https://claw.example';
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

// Google's own limits: 50 000 URLs and 50 MB uncompressed per document.
const GOOGLE_URL_LIMIT = 50_000;
const GOOGLE_BYTE_LIMIT = 50 * 1024 * 1024;

// W3C Datetime, which is what the sitemap protocol requires of <lastmod>:
// a date, optionally with a time.
const W3C_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const W3C_DATETIME_WITH_TIME = /^\d{4}-\d{2}-\d{2}T[\d:.]{5,12}(?:Z|[+-]\d{2}:\d{2})$/u;

function isW3cDatetime(value: string): boolean {
  return W3C_DATE.test(value) || W3C_DATETIME_WITH_TIME.test(value);
}

const mockChatSharePage = vi.fn();

vi.mock('@/lib/chat-shares/public-chat-share.service', () => ({
  countIndexableChatShares: (locale: string): unknown => Promise.resolve({ locale, count: 0 }),
  getIndexableChatSharePage: (locale: string, cursor: string | null): unknown =>
    mockChatSharePage(locale, cursor),
}));

function parse(xml: string): Document {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  expect(parsed.querySelector('parsererror')).toBeNull();
  return parsed;
}

async function fetchIndex(): Promise<string> {
  const { GET } = await import('../sitemap.xml/route');
  return (await GET()).text();
}

async function fetchChild(locale: string, document: string): Promise<Response> {
  const { GET } = await import('../sitemaps/[locale]/[document]/route');
  return GET(new Request(`${SITE}/sitemaps/${locale}/${document}`), {
    params: Promise.resolve({ locale, document }),
  });
}

// Everything here is a rule Google applies when it reads a sitemap. A document
// can be perfectly well-formed XML and still be rejected — wrong namespace,
// a cross-host URL, a lastmod it cannot parse, an index pointing at another
// index — and the only symptom is "couldn't fetch" in Search Console weeks
// later. These assertions are the parts we can prove from here.
describe('sitemaps are readable by Google', () => {
  beforeEach(() => {
    vi.resetModules();
    mockChatSharePage.mockReset();
    mockChatSharePage.mockResolvedValue(null);
    vi.stubEnv('NODE_ENV', 'production');
    process.env['SITE_URL'] = SITE;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  it(
    'declares the sitemap protocol namespace on both document kinds',
    async () => {
      const index = parse(await fetchIndex());
      const child = parse(await (await fetchChild('en', 'pages-1.xml')).text());

      expect(index.documentElement.localName).toBe('sitemapindex');
      expect(index.documentElement.namespaceURI).toBe(SITEMAP_NS);
      expect(child.documentElement.localName).toBe('urlset');
      expect(child.documentElement.namespaceURI).toBe(SITEMAP_NS);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'keeps the stylesheet instruction outside the document element',
    async () => {
      // Google reads the markup and ignores the instruction; a PI emitted
      // inside <urlset> would be a parse error instead.
      const xml = await (await fetchChild('en', 'pages-1.xml')).text();

      expect(xml.indexOf('<?xml-stylesheet')).toBeLessThan(xml.indexOf('<urlset'));
      expect(parse(xml).getElementsByTagNameNS(SITEMAP_NS, 'url').length).toBeGreaterThan(0);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'points the index at url sets, never at another index',
    async () => {
      // Nested sitemap indexes are invalid; Google rejects the whole file.
      const index = parse(await fetchIndex());
      const children = [...index.getElementsByTagNameNS(SITEMAP_NS, 'loc')].map(
        (node) => node.textContent ?? '',
      );

      expect(children.length).toBeGreaterThan(0);
      for (const child of children) {
        const path = new URL(child).pathname;
        const document = await fetchChild(path.split('/')[2] ?? '', path.split('/')[3] ?? '');
        expect(parse(await document.text()).documentElement.localName).toBe('urlset');
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'lists only absolute URLs on the sitemap host',
    async () => {
      // A sitemap may only contain URLs from its own origin.
      const index = parse(await fetchIndex());
      const child = parse(await (await fetchChild('ar', 'pages-1.xml')).text());
      const locations = [
        ...[...index.getElementsByTagNameNS(SITEMAP_NS, 'loc')],
        ...[...child.getElementsByTagNameNS(SITEMAP_NS, 'loc')],
      ].map((node) => node.textContent ?? '');

      for (const location of locations) {
        expect(location.startsWith(`${SITE}/`)).toBe(true);
        expect(new URL(location).host).toBe(new URL(SITE).host);
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'writes every lastmod as a W3C datetime',
    async () => {
      const child = parse(await (await fetchChild('de', 'pages-1.xml')).text());
      const stamps = [...child.getElementsByTagNameNS(SITEMAP_NS, 'lastmod')].map(
        (node) => node.textContent ?? '',
      );

      expect(stamps.length).toBeGreaterThan(0);
      for (const stamp of stamps) {
        expect(isW3cDatetime(stamp)).toBe(true);
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'gives every alternate set a self-reference and an x-default',
    async () => {
      // Google drops a whole hreflang cluster that does not include the page
      // itself, so the annotation silently does nothing.
      const child = parse(await (await fetchChild('fr', 'pages-1.xml')).text());

      for (const url of [...child.getElementsByTagNameNS(SITEMAP_NS, 'url')]) {
        const self = url.getElementsByTagNameNS(SITEMAP_NS, 'loc')[0]?.textContent ?? '';
        const alternates = [...url.getElementsByTagNameNS(XHTML_NS, 'link')].map((link) => ({
          language: link.getAttribute('hreflang') ?? '',
          url: link.getAttribute('href') ?? '',
        }));

        expect(alternates.map((entry) => entry.url)).toContain(self);
        expect(alternates.map((entry) => entry.language)).toContain('x-default');
        for (const alternate of alternates) {
          expect(alternate.language).toMatch(/^(?:x-default|[a-z]{2}|[a-z]{2}-[A-Za-z]{2,8})$/u);
          expect(alternate.url.startsWith(`${SITE}/`)).toBe(true);
        }
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'never lists a URL that robots.txt disallows',
    async () => {
      // A blocked URL in a sitemap is a permanent Search Console warning and
      // the page never gets indexed anyway.
      const child = parse(await (await fetchChild('en', 'pages-1.xml')).text());
      const paths = [...child.getElementsByTagNameNS(SITEMAP_NS, 'loc')].map(
        (node) => new URL(node.textContent ?? '').pathname,
      );

      for (const path of paths) {
        for (const prefix of PRIVATE_ROUTE_PREFIXES) {
          expect(path.startsWith(prefix)).toBe(false);
          expect(path.startsWith(`/en${prefix}`)).toBe(false);
        }
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // The rules above were asserted against the pages half only. Shared chats
  // reach Google through the same documents and carry a different lastmod
  // source (`updatedAt`, a full timestamp) and a different URL shape.
  it(
    'holds the chat half to the same rules as the pages half, once the AdSense review lockdown is lifted',
    async () => {
      // CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED excludes chats-*.xml entirely today
      // (asserted in sitemap.test.ts); this test exercises the URL/lastmod
      // shape the chat half must have once that lockdown is lifted.
      vi.doMock('@/constants/chat-share-review-lockdown.constants', () => ({
        CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED: false,
      }));
      mockChatSharePage.mockResolvedValue({
        items: [
          {
            publicShareId: 'share-abc',
            contentLocale: 'en',
            updatedAt: '2026-08-20T10:00:00.000Z',
          },
        ],
        nextCursor: null,
      });

      const child = parse(await (await fetchChild('en', 'chats-1.xml')).text());
      const url = child.getElementsByTagNameNS(SITEMAP_NS, 'url')[0];
      const location = url?.getElementsByTagNameNS(SITEMAP_NS, 'loc')[0]?.textContent ?? '';
      const stamp = url?.getElementsByTagNameNS(SITEMAP_NS, 'lastmod')[0]?.textContent ?? '';

      expect(location).toBe(`${SITE}/en/share/chat/share-abc`);
      expect(new URL(location).host).toBe(new URL(SITE).host);
      expect(isW3cDatetime(stamp)).toBe(true);

      vi.doUnmock('@/constants/chat-share-review-lockdown.constants');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'stays inside the 50 000 URL and 50 MB limits, and says so in the content type',
    async () => {
      const response = await fetchChild('en', 'pages-1.xml');
      const xml = await response.text();
      const child = parse(xml);

      expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
      expect(child.getElementsByTagNameNS(SITEMAP_NS, 'url').length).toBeLessThanOrEqual(
        GOOGLE_URL_LIMIT,
      );
      expect(SITEMAP_URL_CHUNK_SIZE).toBeLessThanOrEqual(GOOGLE_URL_LIMIT);
      expect(new TextEncoder().encode(xml).byteLength).toBeLessThan(GOOGLE_BYTE_LIMIT);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'answers an unknown document with 404 rather than an empty urlset',
    async () => {
      // An empty but successful sitemap looks healthy while indexing nothing.
      expect((await fetchChild('en', 'nonsense.xml')).status).toBe(404);
      expect((await fetchChild('xx', 'pages-1.xml')).status).toBe(404);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // Caught by turning the anti-gaming pass on this file: the assertion above
  // stated the principle while the route broke it for the case that actually
  // occurs. A chunk beyond the end returned 200 with zero URLs — and the index
  // can point at a chunk that has since shrunk away, so Googlebot reaches this
  // without anyone typing a URL by hand.
  it(
    'answers a chunk past the end with 404, not an empty urlset',
    async () => {
      expect((await fetchChild('en', 'pages-2.xml')).status).toBe(404);
      expect((await fetchChild('en', 'pages-99.xml')).status).toBe(404);
      expect((await fetchChild('en', 'chats-3.xml')).status).toBe(404);

      // The first chunk stays answerable: an empty one is a locale with nothing
      // published yet, which the index simply does not link.
      expect((await fetchChild('en', 'pages-1.xml')).status).toBe(200);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
