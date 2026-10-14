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

describe('all-threads sitemap family', () => {
  beforeEach(() => {
    vi.mocked(getPublicThreadSitemapPage).mockReset();
  });

  it('lists Threads of every language under the app locale and asks for the all scope', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({
      total: 3,
      items: [
        { slug: SLUGS.ar, publishedAt: '2026-10-13T00:00:00.000Z' },
        { slug: 'why-is-the-sky-blue-a1b2c3d4', publishedAt: '2026-10-12T00:00:00.000Z' },
        { slug: SLUGS.ja, publishedAt: '2026-10-11T00:00:00.000Z' },
      ],
    });

    const response = await GET(
      new Request('https://claw-ai.co/x'),
      context('de', 'all-threads-1.xml'),
    );
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(getPublicThreadSitemapPage).toHaveBeenCalledWith(null, 0);
    expect(xml).toContain(
      `<loc>https://claw-ai.co/de/threads/${encodeURIComponent(SLUGS.ar)}</loc>`,
    );
    expect(xml).toContain('<loc>https://claw-ai.co/de/threads/why-is-the-sky-blue-a1b2c3d4</loc>');
    expect(xml).toContain(
      `<loc>https://claw-ai.co/de/threads/${encodeURIComponent(SLUGS.ja)}</loc>`,
    );
    expect(xml).not.toContain(SLUGS.ar);
    expect(xml).not.toMatch(/<loc>[^<]*[ ][^<]*<\/loc>/u);
  });

  it('maps chunk N to page N-1', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({
      total: 10_001,
      items: [{ slug: 'late-a1b2c3d4', publishedAt: '2026-10-01T00:00:00.000Z' }],
    });
    const response = await GET(
      new Request('https://claw-ai.co/x'),
      context('en', 'all-threads-2.xml'),
    );
    expect(response.status).toBe(200);
    expect(getPublicThreadSitemapPage).toHaveBeenCalledWith(null, 1);
  });

  it('answers 404 for a chunk beyond the end, chunk 0 and a service outage', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({ total: 1, items: [] });
    expect(
      (await GET(new Request('https://claw-ai.co/x'), context('en', 'all-threads-9.xml'))).status,
    ).toBe(404);
    expect(
      (await GET(new Request('https://claw-ai.co/x'), context('en', 'all-threads-0.xml'))).status,
    ).toBe(404);
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue(null);
    expect(
      (await GET(new Request('https://claw-ai.co/x'), context('en', 'all-threads-1.xml'))).status,
    ).toBe(404);
  });

  it('serves an empty first chunk as an empty urlset and rejects unknown locales', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({ total: 0, items: [] });
    const empty = await GET(
      new Request('https://claw-ai.co/x'),
      context('en', 'all-threads-1.xml'),
    );
    expect(empty.status).toBe(200);
    expect(await empty.text()).not.toContain('<loc>');
    expect(
      (await GET(new Request('https://claw-ai.co/x'), context('xx', 'all-threads-1.xml'))).status,
    ).toBe(404);
  });

  it('leaves the per-locale family on its own locale scope', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({ total: 0, items: [] });
    await GET(new Request('https://claw-ai.co/x'), context('ar', 'threads-1.xml'));
    expect(getPublicThreadSitemapPage).toHaveBeenCalledWith('ar', 0);
  });
});
