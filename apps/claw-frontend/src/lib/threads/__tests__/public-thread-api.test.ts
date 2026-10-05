import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  countPublicThreads,
  getPublicThreadPublication,
  getPublicThreadSitemapPage,
  listPublicThreadDiscoveries,
  listPublicThreadFeedEntries,
} from '@/lib/threads/public-thread-api';

describe('public Threads API', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('loads only well-formed public slugs without caching article responses', async () => {
    vi.stubEnv('THREADS_SERVICE_URL', 'https://threads.internal');
    const article = { slug: 'a-valid-article', contentLocale: 'en' };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(article));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPublicThreadPublication('a-valid-article')).resolves.toEqual(article);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://threads.internal/api/v1/thread-publications/public/a-valid-article',
      expect.objectContaining({ cache: 'no-store' }),
    );
    await expect(getPublicThreadPublication('bad slug')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads discovery, feed, and sitemap data by locale', async () => {
    vi.stubEnv('THREADS_SERVICE_URL', 'https://threads.internal');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [{ slug: 'one' }] }))
      .mockResolvedValueOnce(Response.json({ items: [{ slug: 'two' }] }))
      .mockResolvedValueOnce(Response.json({ total: 3 }))
      .mockResolvedValueOnce(
        Response.json({ total: 3, items: [{ slug: 'one', publishedAt: '2026-10-05' }] }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listPublicThreadDiscoveries('en')).resolves.toEqual([{ slug: 'one' }]);
    await expect(listPublicThreadFeedEntries('ar')).resolves.toEqual([{ slug: 'two' }]);
    await expect(countPublicThreads('en')).resolves.toBe(3);
    await expect(getPublicThreadSitemapPage('fr', 2)).resolves.toMatchObject({ total: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('fails closed when the discovery service is unavailable', async () => {
    vi.stubEnv('THREADS_SERVICE_URL', 'https://threads.internal');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(listPublicThreadDiscoveries('en')).resolves.toEqual([]);
    await expect(countPublicThreads('en')).resolves.toBe(0);
    await expect(getPublicThreadSitemapPage('en', 0)).resolves.toBeNull();
  });
});
