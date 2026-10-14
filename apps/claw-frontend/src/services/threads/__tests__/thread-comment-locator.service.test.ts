import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';
import { locateAndLoadComment } from '@/services/threads/thread-comment-locator.service';
import { threadCommentFixture } from '@/test/fixtures/thread-comment.fixture';
import type { ThreadCommentsData } from '@/types/thread-community.types';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { locatePublicComment: vi.fn(), listPublicReplies: vi.fn() },
}));

const repo = vi.mocked(threadPublicationsRepository);
const KEY = queryKeys.threadPublications.comments('s');

function seed(queryClient: QueryClient): void {
  const root = threadCommentFixture({
    id: 'c1',
    replyCount: 5,
    hasMoreReplies: true,
    nextReplyCursor: 'cur1',
    replies: [threadCommentFixture({ id: 'r1', rootId: 'c1', parentId: 'c1' })],
  });
  const data: ThreadCommentsData = {
    pages: [{ items: [root], page: 1, pageSize: 20, total: 1, totalPages: 1 }],
    pageParams: [1],
  };
  queryClient.setQueryData(KEY, data);
}

describe('locateAndLoadComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads reply pages of the root until the linked reply is in the cache', async () => {
    const queryClient = new QueryClient();
    seed(queryClient);
    repo.locatePublicComment.mockResolvedValue({ id: 'r5', rootId: 'c1' });
    repo.listPublicReplies
      .mockResolvedValueOnce({
        items: [threadCommentFixture({ id: 'r2', createdAt: '2026-10-05T12:01:00.000Z' })],
        nextCursor: 'cur2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [threadCommentFixture({ id: 'r5', createdAt: '2026-10-05T12:05:00.000Z' })],
        nextCursor: null,
        hasMore: false,
      });

    const found = await locateAndLoadComment({
      slug: 's',
      commentId: 'r5',
      queryClient,
      fetchNextRoots: vi.fn(),
    });

    const data = queryClient.getQueryData<ThreadCommentsData>(KEY);
    expect(found).toBe(true);
    expect(data?.pages[0]?.items[0]?.replies.map(({ id }) => id)).toEqual(['r1', 'r2', 'r5']);
    expect(repo.listPublicReplies).toHaveBeenNthCalledWith(1, 's', 'c1', 'cur1');
    expect(repo.listPublicReplies).toHaveBeenNthCalledWith(2, 's', 'c1', 'cur2');
  });

  it('reports a comment that no longer exists', async () => {
    const queryClient = new QueryClient();
    seed(queryClient);
    repo.locatePublicComment.mockRejectedValue(
      new ApiClientError({ message: 'Comment not found', status: 404 }),
    );

    await expect(
      locateAndLoadComment({ slug: 's', commentId: 'gone', queryClient, fetchNextRoots: vi.fn() }),
    ).resolves.toBe(false);
    expect(repo.listPublicReplies).not.toHaveBeenCalled();
  });

  it('stops after the page bound when replies never contain the comment', async () => {
    const queryClient = new QueryClient();
    seed(queryClient);
    repo.locatePublicComment.mockResolvedValue({ id: 'zz', rootId: 'c1' });
    repo.listPublicReplies.mockResolvedValue({ items: [], nextCursor: 'more', hasMore: true });

    await locateAndLoadComment({
      slug: 's',
      commentId: 'zz',
      queryClient,
      fetchNextRoots: vi.fn(),
    });

    expect(repo.listPublicReplies).toHaveBeenCalledTimes(10);
  });

  it('pages in more top-level comments when the root is on a later page', async () => {
    const queryClient = new QueryClient();
    const data: ThreadCommentsData = {
      pages: [{ items: [], page: 1, pageSize: 20, total: 30, totalPages: 2 }],
      pageParams: [1],
    };
    queryClient.setQueryData(KEY, data);
    repo.locatePublicComment.mockResolvedValue({ id: 'c9', rootId: 'c9' });
    const fetchNextRoots = vi.fn(async () => {
      queryClient.setQueryData<ThreadCommentsData>(KEY, {
        pages: [
          ...data.pages,
          {
            items: [threadCommentFixture({ id: 'c9' })],
            page: 2,
            pageSize: 20,
            total: 30,
            totalPages: 2,
          },
        ],
        pageParams: [1, 2],
      });
    });

    await locateAndLoadComment({ slug: 's', commentId: 'c9', queryClient, fetchNextRoots });

    expect(fetchNextRoots).toHaveBeenCalledTimes(1);
  });
});
