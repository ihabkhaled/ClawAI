import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;
const mockCountIndexableChatShares = vi.fn();

vi.mock('@/lib/chat-shares/public-chat-share.service', () => ({
  countIndexableChatShares: (locale: string): unknown => mockCountIndexableChatShares(locale),
}));

describe('sitemap index route', () => {
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

  it(
    'fails closed outside the canonical production environment',
    async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const { GET } = await import('../sitemap.xml/route');

      const response = await GET();

      expect(await response.text()).toContain('<sitemapindex');
      expect(mockCountIndexableChatShares).not.toHaveBeenCalled();
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
