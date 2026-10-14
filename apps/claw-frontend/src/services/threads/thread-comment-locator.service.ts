import { THREAD_COMMENT_LOCATE_MAX_PAGES } from '@/constants/thread-community.constants';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  ThreadCommentLocateRequest,
  ThreadCommentsData,
} from '@/types/thread-community.types';
import { findComment, mergeReplies, updateComment } from '@/utilities/thread-comment-tree.utility';

function cached(request: ThreadCommentLocateRequest): ThreadCommentsData | undefined {
  return request.queryClient.getQueryData<ThreadCommentsData>(
    queryKeys.threadPublications.comments(request.slug),
  );
}

function hasMoreRoots(data: ThreadCommentsData | undefined): boolean {
  const last = data?.pages.at(-1);
  return last !== undefined && last.page < last.totalPages;
}

/**
 * Brings a linked comment (a notification's `#comment-<id>`) into the cache: asks the server which
 * conversation it belongs to, loads top-level pages until that conversation is there, then its
 * reply pages until the comment is. Bounded, so a long Thread never turns into a request flood.
 * Resolves true when the comment is on screen or could not be checked, false when it is gone.
 */
export async function locateAndLoadComment(request: ThreadCommentLocateRequest): Promise<boolean> {
  let rootId: string;
  try {
    ({ rootId } = await threadPublicationsRepository.locatePublicComment(
      request.slug,
      request.commentId,
    ));
  } catch (error: unknown) {
    return !(error instanceof ApiClientError && error.status === 404);
  }
  for (let page = 0; page < THREAD_COMMENT_LOCATE_MAX_PAGES; page += 1) {
    const data = cached(request);
    if (!data || findComment(data, rootId) !== null || !hasMoreRoots(data)) {
      break;
    }
    await request.fetchNextRoots();
  }
  for (let page = 0; page < THREAD_COMMENT_LOCATE_MAX_PAGES; page += 1) {
    const data = cached(request);
    const root = data ? findComment(data, rootId) : null;
    if (!root || root.replies.some(({ id }) => id === request.commentId) || !root.hasMoreReplies) {
      break;
    }
    const replies = await threadPublicationsRepository.listPublicReplies(
      request.slug,
      rootId,
      root.nextReplyCursor,
    );
    request.queryClient.setQueryData<ThreadCommentsData>(
      queryKeys.threadPublications.comments(request.slug),
      (current) =>
        current
          ? updateComment(current, rootId, (found) => ({
              ...found,
              replies: mergeReplies(found.replies, replies.items),
              nextReplyCursor: replies.nextCursor,
              hasMoreReplies: replies.hasMore,
            }))
          : current,
    );
  }
  return true;
}
