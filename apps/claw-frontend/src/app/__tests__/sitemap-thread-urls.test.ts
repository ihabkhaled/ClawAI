import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPublicThreadSitemapPage } from '@/lib/threads/public-thread-api';

import { GET } from '../sitemaps/[locale]/[document]/route';

vi.mock('@/lib/threads/public-thread-api', () => ({ getPublicThreadSitemapPage: vi.fn() }));
vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: () => 'https://claw-ai.co',
  shouldNoIndexEverything: () => false,
}));

const SLUGS = {
  ar: 'كيف-يعمل-التمثيل-a1b2c3d4',
  fa: 'فتوسنتز-در-گیاهان-a1b2c3d4',
  hi: 'प्रकाश-संश्लेषण-a1b2c3d4',
  ja: '茶道-入門-a1b2c3d4',
} as const;

function context(
  locale: string,
  document: string,
): { params: Promise<{ locale: string; document: string }> } {
  return { params: Promise.resolve({ locale, document }) };
}

describe('Thread sitemap URLs', () => {
  beforeEach(() => {
    vi.mocked(getPublicThreadSitemapPage).mockReset();
  });

  it.each(Object.entries(SLUGS))(
    'encodes the %s slug as one path segment',
    async (locale, slug) => {
      vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({
        total: 1,
        items: [{ slug, publishedAt: '2026-10-13T00:00:00.000Z' }],
      });

      const response = await GET(
        new Request('https://claw-ai.co/x'),
        context(locale, 'threads-1.xml'),
      );
      const xml = await response.text();

      expect(response.status).toBe(200);
      expect(xml).toContain(
        `<loc>https://claw-ai.co/${locale}/threads/${encodeURIComponent(slug)}</loc>`,
      );
      expect(xml).not.toContain(slug);
    },
  );

  it('leaves an ASCII slug readable', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({
      total: 1,
      items: [{ slug: 'why-is-the-sky-blue-a1b2c3d4', publishedAt: '2026-10-13T00:00:00.000Z' }],
    });
    const response = await GET(new Request('https://claw-ai.co/x'), context('en', 'threads-1.xml'));
    expect(await response.text()).toContain('/en/threads/why-is-the-sky-blue-a1b2c3d4</loc>');
  });
});
