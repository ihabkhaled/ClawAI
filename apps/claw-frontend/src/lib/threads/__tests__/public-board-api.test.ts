import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { getPublicBoardPage } from '@/lib/threads/public-board-api';

const STATE = {
  q: '',
  sort: ThreadBoardSort.Latest,
  lang: ThreadBoardAllFilter.All,
  type: ThreadBoardAllFilter.All,
  page: 1,
};

const BODY = {
  items: [
    {
      slug: 'one',
      title: 'One',
      excerpt: 'x',
      contentLocale: 'en',
      publicationType: 'article',
      publishedAt: '2026-10-01T00:00:00.000Z',
      ownerId: 'private',
    },
  ],
  meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
};

describe('getPublicBoardPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reads the public endpoint, cached for a minute, and strips private fields', async () => {
    vi.stubEnv('THREADS_SERVICE_URL', 'https://threads.internal/');
    const fetchMock = vi.fn().mockResolvedValue(Response.json(BODY));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getPublicBoardPage({ ...STATE, q: 'rag', page: 3 });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      'https://threads.internal/api/v1/thread-publications/public/board?sort=latest&lang=all&type=all&page=3&limit=12&q=rag',
    );
    expect(init).toMatchObject({ next: { revalidate: 60 } });
    expect(JSON.stringify(init)).not.toContain('Authorization');
    expect(result?.items[0]?.slug).toBe('one');
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('is null when no threads service is configured', async () => {
    vi.stubEnv('THREADS_SERVICE_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPublicBoardPage(STATE)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['an error status', () => Promise.resolve(new Response('no', { status: 503 }))],
    ['an unreadable body', () => Promise.resolve(Response.json({ message: 'x' }))],
    ['a network failure', () => Promise.reject(new Error('down'))],
  ])('is null on %s, so the client can show its own error state', async (_name, respond) => {
    vi.stubEnv('THREADS_SERVICE_URL', 'https://threads.internal');
    vi.stubGlobal('fetch', vi.fn(respond));
    expect(await getPublicBoardPage(STATE)).toBeNull();
  });
});
