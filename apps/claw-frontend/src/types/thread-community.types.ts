import type { InfiniteData, QueryClient, UseMutationResult } from '@tanstack/react-query';
import type { RefObject } from 'react';

import type { ThreadMentionTokenKind } from '@/enums/thread-mention-token-kind.enum';
import type { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import type { ThreadCommunityActionState } from '@/types/thread-publication.types';

/** The publisher or commenter as the public API shows them. */
export type ThreadAuthor = {
  username: string;
  displayName: string;
};

export type ThreadReactionCounts = {
  likes: number;
  dislikes: number;
  viewerReaction: ThreadPublicationReaction | null;
};

/** One comment or reply. A reply to a reply is stored flat under its root. */
export type ThreadCommentNode = ThreadReactionCounts & {
  id: string;
  parentId: string | null;
  rootId: string | null;
  content: string;
  createdAt: string;
  author: ThreadAuthor | null;
  replyTo: ThreadAuthor | null;
  mentions: Array<{ username: string }>;
  replyCount: number;
  replies: ThreadCommentNode[];
  hasMoreReplies: boolean;
  /** True for a hidden or removed comment kept because it has replies; `content` is a stub. */
  removed: boolean;
  /** Where the next page of replies starts (`.../replies?cursor=`); null once all are loaded. */
  nextReplyCursor: string | null;
};

export type ThreadCommentPage = {
  items: ThreadCommentNode[];
  page: number;
  pageSize: number;
  total: number;
  /** Every visible comment and reply of the Thread; absent from an older server. */
  commentTotal?: number;
  totalPages: number;
};

export type ThreadReplyPage = {
  items: ThreadCommentNode[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ThreadCommentsData = InfiniteData<ThreadCommentPage, number>;

export type ThreadCommentLocation = { id: string; rootId: string };

export type ThreadCommentLocateRequest = {
  slug: string;
  commentId: string;
  queryClient: QueryClient;
  /** Loads the next page of top-level comments into the cache. */
  fetchNextRoots: () => Promise<unknown>;
};

export type ThreadMentionToken = {
  /** Where the part starts in the text; unique, so it doubles as a render key. */
  start: number;
  kind: ThreadMentionTokenKind;
  value: string;
};

export type ThreadCommentReactionRequest = {
  commentId: string;
  next: ThreadPublicationReaction | null;
};

export type ThreadCommentReactionMutation = UseMutationResult<
  ThreadReactionCounts,
  Error,
  ThreadCommentReactionRequest,
  { previous: ThreadCommentsData | undefined }
>;

export type ThreadCommentReactionsController = {
  isPending: boolean;
  isFailed: boolean;
  toggle: (value: ThreadPublicationReaction) => void;
};

export type ThreadCommentReactionsProps = {
  slug: string;
  comment: ThreadCommentNode;
  isAuthenticated: boolean;
  loginHref: string;
};

export type ThreadCommentComposerController = {
  text: string;
  setText: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isEmpty: boolean;
  isPending: boolean;
  isFailed: boolean;
  submit: () => void;
};

export type ThreadCommentComposerProps = {
  slug: string;
  parentId: string;
  /** The person being answered, shown in the label. */
  replyingTo: ThreadAuthor | null;
  initialText: string;
  onDone: () => void;
};

export type ThreadCommentItemProps = {
  slug: string;
  comment: ThreadCommentNode;
  isReply: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  highlightedId: string | null;
  actions: ThreadCommunityActionState;
  onReply: (comment: ThreadCommentNode) => void;
};

export type ThreadCommentThreadProps = {
  slug: string;
  comment: ThreadCommentNode;
  isAuthenticated: boolean;
  loginHref: string;
  highlightedId: string | null;
  actions: ThreadCommunityActionState;
};

export type ThreadCommentThreadController = {
  replyTarget: ThreadCommentNode | null;
  openReply: (comment: ThreadCommentNode) => void;
  closeReply: () => void;
  loadMore: () => void;
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
  remaining: number;
};

export type ThreadAuthorBadgeProps = {
  author: ThreadAuthor | null;
  compact?: boolean;
};

export type ThreadCommentsFeed = {
  comments: ThreadCommentNode[];
  /** The comment the URL fragment points at, for a few seconds after it scrolls into view. */
  highlightedId: string | null;
  /** True when the URL points at a comment that no longer exists. */
  commentMissing: boolean;
  /** Comments and replies together. */
  commentTotal: number;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};
