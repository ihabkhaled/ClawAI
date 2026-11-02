import { beforeEach, describe, expect, it, vi } from 'vitest';

import { countPublicThreads, getPublicThreadSitemapPage } from '@/lib/threads/public-thread-api';

import { GET as indexGet } from '../sitemap.xml/route';
import { GET as childGet } from '../sitemaps/[locale]/[document]/route';

vi.mock('@/lib/threads/public-thread-api', () => ({
  countPublicThreads: vi.fn(),
  getPublicThreadSitemapPage: vi.fn(),
}));
vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: () => 'https://claw-ai.co',
  shouldNoIndexEverything: () => false,
}));

function context(
  locale: string,
  document: string,
): { params: Promise<{ locale: string; document: string }> } {
  return { params: Promise.resolve({ locale, document }) };
}

describe('translated Threads sitemap family', () => {
  beforeEach(() => {
    vi.mocked(countPublicThreads).mockReset();
    vi.mocked(getPublicThreadSitemapPage).mockReset();
  });

  it('lists translated chunks only for the languages that have translations', async () => {
    vi.mocked(countPublicThreads).mockImplementation(async (locale, translated) =>
      translated === true && (locale === 'ar' || locale === 'de') ? 3 : 0,
    );

    const xml = await (await indexGet()).text();

    expect(xml).toContain('<loc>https://claw-ai.co/sitemaps/ar/translated-threads-1.xml</loc>');
    expect(xml).toContain('<loc>https://claw-ai.co/sitemaps/de/translated-threads-1.xml</loc>');
    expect(xml).not.toContain('/sitemaps/fr/translated-threads-1.xml');
    expect(xml).not.toContain('translated-threads-2.xml');
  });

  it('chunks the translated count by the page size', async () => {
    vi.mocked(countPublicThreads).mockImplementation(async (locale, translated) =>
      translated === true && locale === 'ja' ? 10_001 : 0,
    );

    const xml = await (await indexGet()).text();

    expect(xml).toContain('/sitemaps/ja/translated-threads-1.xml');
    expect(xml).toContain('/sitemaps/ja/translated-threads-2.xml');
    expect(xml).not.toContain('/sitemaps/ja/translated-threads-3.xml');
  });

  it('lists each translation as its own ?lang page under its language', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({
      total: 1,
      items: [{ slug: 'why-is-the-sky-blue-a1b2c3d4', publishedAt: '2026-11-02T00:00:00.000Z' }],
    });

    const response = await childGet(
      new Request('https://claw-ai.co/x'),
      context('ar', 'translated-threads-1.xml'),
    );
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(getPublicThreadSitemapPage).toHaveBeenCalledWith('ar', 0, true);
    expect(xml).toContain(
      '<loc>https://claw-ai.co/ar/threads/why-is-the-sky-blue-a1b2c3d4?lang=ar</loc>',
    );
  });

  it('answers 404 for a chunk past the end or a malformed chunk number', async () => {
    vi.mocked(getPublicThreadSitemapPage).mockResolvedValue({ total: 0, items: [] });

    const past = await childGet(
      new Request('https://claw-ai.co/x'),
      context('ar', 'translated-threads-2.xml'),
    );
    const zero = await childGet(
      new Request('https://claw-ai.co/x'),
      context('ar', 'translated-threads-0.xml'),
    );

    expect(past.status).toBe(404);
    expect(zero.status).toBe(404);
  });
});
