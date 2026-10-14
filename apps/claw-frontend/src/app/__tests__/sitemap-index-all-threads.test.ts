import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { countPublicThreads } from '@/lib/threads/public-thread-api';

import { GET } from '../sitemap.xml/route';

vi.mock('@/lib/threads/public-thread-api', () => ({ countPublicThreads: vi.fn() }));
vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: () => 'https://claw-ai.co',
  shouldNoIndexEverything: () => false,
}));

async function indexXml(): Promise<string> {
  return (await GET()).text();
}

describe('sitemap index all-threads family', () => {
  beforeEach(() => {
    vi.mocked(countPublicThreads).mockReset();
  });

  it('lists no all-threads chunk when there are no Threads at all', async () => {
    vi.mocked(countPublicThreads).mockResolvedValue(0);
    const xml = await indexXml();
    expect(xml).not.toContain('all-threads-');
    expect(xml).not.toContain('/threads-1.xml');
  });

  it('lists an all-threads chunk for every app locale when Threads exist in any language', async () => {
    // Only Arabic Threads exist: the per-locale family is for ar alone, but every app locale
    // can open them, so every locale gets the all-threads chunk.
    vi.mocked(countPublicThreads).mockImplementation(async (locale) =>
      locale === null || locale === 'ar' ? 2 : 0,
    );
    const xml = await indexXml();
    for (const { locale } of SUPPORTED_LOCALES) {
      expect(xml).toContain(`<loc>https://claw-ai.co/sitemaps/${locale}/all-threads-1.xml</loc>`);
    }
    expect(xml).toContain('/sitemaps/ar/threads-1.xml');
    expect(xml).not.toContain('/sitemaps/en/threads-1.xml');
    expect(xml).not.toContain('all-threads-2.xml');
  });

  it('chunks the all-threads count by the same page size', async () => {
    vi.mocked(countPublicThreads).mockImplementation(async (locale) =>
      locale === null ? 10_001 : 0,
    );
    const xml = await indexXml();
    expect(xml).toContain('/sitemaps/en/all-threads-1.xml');
    expect(xml).toContain('/sitemaps/en/all-threads-2.xml');
    expect(xml).not.toContain('/sitemaps/en/all-threads-3.xml');
  });
});
