import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;
const mockCountIndexableChatShares = vi.fn();

vi.mock('@/lib/chat-shares/public-chat-share.service', () => ({
  countIndexableChatShares: (locale: string): unknown => mockCountIndexableChatShares(locale),
}));

describe('sitemap index route', () => {
  it('is rendered at request time so production runtime configuration controls discovery', async () => {
    const route = await import('../sitemap.xml/route');
    expect(route.dynamic).toBe('force-dynamic');
  });

  beforeEach(() => {
    vi.resetModules();
    mockCountIndexableChatShares.mockReset();
    mockCountIndexableChatShares.mockImplementation((locale: string) =>
      Promise.resolve({ locale, count: 0 }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  it(
    'publishes localized page and bounded chat child documents',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      mockCountIndexableChatShares.mockImplementation((locale: string) =>
        Promise.resolve({ locale, count: locale === 'ja' ? 40_001 : 0 }),
      );
      const { GET } = await import('../sitemap.xml/route');

      const response = await GET();
      const xml = await response.text();

      expect(xml).toContain('https://claw.example/sitemaps/en/pages-1.xml');
      expect(xml).toContain('https://claw.example/sitemaps/ar/pages-1.xml');
      expect(xml).toContain('https://claw.example/sitemaps/zh/pages-1.xml');
      expect(xml).toContain('https://claw.example/sitemaps/ja/chats-1.xml');
      expect(xml).toContain('https://claw.example/sitemaps/ja/chats-2.xml');
      expect(xml).not.toContain('/share/chat/');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // The index used to hardcode `pages-1.xml`. That silently capped the static
  // half at one chunk, so a locale that grew past the 40 000-URL chunk limit
  // would have had its remaining pages unreachable while the index still looked
  // healthy. Every locale carries the same 16 registry pages today, so the
  // guard is that the count decides the chunk list rather than a literal.
  it(
    'derives page chunks from the registry instead of assuming a single one',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const [{ GET }, { SITEMAP_URL_CHUNK_SIZE }, registry] = await Promise.all([
        import('../sitemap.xml/route'),
        import('@/constants/seo-discovery.constants'),
        import('@/utilities/content-registry.utility'),
      ]);
      const { Locale } = await import('@/enums/locale.enum');

      const xml = await (await GET()).text();
      const expectedChunks = Math.ceil(
        registry.getIndexablePagesForLocale(Locale.EN).length / SITEMAP_URL_CHUNK_SIZE,
      );

      expect(expectedChunks).toBeGreaterThan(0);
      expect(xml).toContain(`https://claw.example/sitemaps/en/pages-${String(expectedChunks)}.xml`);
      expect(xml).not.toContain(
        `https://claw.example/sitemaps/en/pages-${String(expectedChunks + 1)}.xml`,
      );
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'fails closed outside the canonical production environment',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'preview');
      process.env['SITE_URL'] = 'https://claw.example';
      const { GET } = await import('../sitemap.xml/route');

      const response = await GET();

      expect(await response.text()).toContain('<sitemapindex');
      expect(mockCountIndexableChatShares).not.toHaveBeenCalled();
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
