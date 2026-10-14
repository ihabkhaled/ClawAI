import type { ThreadCommentNode } from '@/types/thread-community.types';

/** A top-level comment with no replies; override what a test cares about. */
export function threadCommentFixture(
  overrides: Partial<ThreadCommentNode> = {},
): ThreadCommentNode {
  return {
    id: 'comment-1',
    parentId: null,
    rootId: null,
    content: 'Helpful detail.',
    createdAt: '2026-10-05T12:00:00.000Z',
    author: null,
    replyTo: null,
    mentions: [],
    likes: 0,
    dislikes: 0,
    viewerReaction: null,
    replyCount: 0,
    replies: [],
    hasMoreReplies: false,
    removed: false,
    nextReplyCursor: null,
    ...overrides,
  };
}

export const COMMUNITY_PAGING_PROPS = {
  slug: 'clear-writing',
  highlightedCommentId: null,
  hasMoreComments: false,
  isLoadingMoreComments: false,
  loadMoreComments: (): void => undefined,
} as const;
