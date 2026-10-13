import { ThreadPublicationType } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import { apiClient } from '@/services/shared/api-client';

import { threadBoardRepository } from '../thread-board.repository';

vi.mock('@/services/shared/api-client', () => ({ apiClient: { get: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('threadBoardRepository', () => {
  it('maps list params to the board query and returns data', async () => {
    const data = {
      items: [],
      meta: { total: 0, page: 2, limit: 12, totalPages: 0 },
      didYouMean: null,
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data, status: 200 });
    const signal = new AbortController().signal;

    const out = await threadBoardRepository.list(
      {
        q: 'rag',
        sort: ThreadBoardSort.Liked,
        lang: 'fr',
        type: ThreadPublicationType.GUIDE,
        page: 2,
        limit: 12,
      },
      { signal },
    );

    expect(out).toBe(data);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/thread-publications/board',
      {
        sort: ThreadBoardSort.Liked,
        lang: 'fr',
        type: ThreadPublicationType.GUIDE,
        page: '2',
        limit: '12',
        q: 'rag',
      },
      { signal },
    );
  });

  it('omits an empty q', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {}, status: 200 });
    await threadBoardRepository.list({
      q: '',
      sort: ThreadBoardSort.Latest,
      lang: 'all',
      type: ThreadBoardAllFilter.All,
      page: 1,
      limit: 24,
    });
    const params = vi.mocked(apiClient.get).mock.calls[0]?.[1];
    expect(params).not.toHaveProperty('q');
  });

  it('calls suggest with q and lang', async () => {
    const data = { suggestions: [], didYouMean: null, total: 0, totalCapped: false };
    vi.mocked(apiClient.get).mockResolvedValue({ data, status: 200 });
    const out = await threadBoardRepository.suggest('rag', 'en');
    expect(out).toBe(data);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/thread-publications/board/suggest',
      { q: 'rag', lang: 'en' },
      undefined,
    );
  });
});
