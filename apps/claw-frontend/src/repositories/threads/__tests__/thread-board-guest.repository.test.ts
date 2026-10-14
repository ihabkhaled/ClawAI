import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { threadBoardGuestRepository } from '@/repositories/threads/thread-board-guest.repository';
import { getThreadBoardRepository } from '@/repositories/threads/thread-board-source';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';
import { apiClient } from '@/services/shared/api-client';

vi.mock('@/services/shared/api-client', () => ({ apiClient: { get: vi.fn() } }));

const ITEM = {
  slug: 'a-thread',
  title: 'A thread',
  excerpt: 'Text',
  contentLocale: 'en',
  publicationType: 'guide',
  publishedAt: '2026-10-01T00:00:00.000Z',
  readingMinutes: 2,
  sourceCount: 1,
  likeCount: 0,
  commentCount: 0,
  viewCount: 5,
  ownerId: 'must-not-leak',
};

const PARAMS = {
  q: 'rag',
  sort: ThreadBoardSort.Latest,
  lang: ThreadBoardAllFilter.All,
  type: ThreadBoardAllFilter.All,
  page: 2,
  limit: 12,
};

describe('threadBoardGuestRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists from the public endpoint with the same query contract and strips private fields', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [ITEM], meta: { total: 1, page: 2, limit: 12, totalPages: 1 } },
      status: 200,
    });
    const signal = new AbortController().signal;

    const result = await threadBoardGuestRepository.list(PARAMS, { signal });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/thread-publications/public/board',
      { sort: 'latest', lang: 'all', type: 'all', page: '2', limit: '12', q: 'rag' },
      { signal },
    );
    expect(result.items).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(result.items[0]?.viewerReaction).toBeNull();
  });

  it('suggests from the public suggest endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { suggestions: [], didYouMean: 'rag', total: 0, totalCapped: false },
      status: 200,
    });

    const result = await threadBoardGuestRepository.suggest('rga', '');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/thread-publications/public/board/suggest',
      { q: 'rga', lang: 'all' },
      undefined,
    );
    expect(result.didYouMean).toBe('rag');
  });

  it('treats an unreadable body as an error, not as an empty Board', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: 'an html page', status: 200 });
    await expect(threadBoardGuestRepository.list(PARAMS)).rejects.toThrow(/unreadable/u);
    await expect(threadBoardGuestRepository.suggest('rag', 'en')).rejects.toThrow(/unreadable/u);
  });
});

describe('getThreadBoardRepository', () => {
  it('picks the account Board for members and the public Board for guests', () => {
    expect(getThreadBoardRepository(ThreadBoardMode.Member)).toBe(threadBoardRepository);
    expect(getThreadBoardRepository(ThreadBoardMode.Guest)).toBe(threadBoardGuestRepository);
  });
});
