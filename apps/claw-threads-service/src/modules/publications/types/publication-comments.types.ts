import type { Prisma, PublicationCommentStatus } from '../../../generated/prisma';
import type { PublicAuthor } from '../../author-identity/types/author-identity.types';

export type CommentReactionValue = 'LIKE' | 'DISLIKE';

/** A comment row as the repository reads it. Ids of people stay on this side of the service. */
export type CommentRecord = {
  id: string;
  parentId: string | null;
  rootId: string | null;
  authorId: string | null;
  replyToUserId: string | null;
  content: string;
  status: PublicationCommentStatus;
  createdAt: Date;
  mentions: Array<{ username: string }>;
  /** Status of the comment replied to; null for a top-level comment. */
  parent: { status: PublicationCommentStatus } | null;
};

export type CommentTally = {
  likes: number;
  dislikes: number;
  viewerReaction: CommentReactionValue | null;
};

/** What the view builder needs besides the row: names, vote totals and reply counts. */
export type CommentLookup = {
  authors: ReadonlyMap<string, PublicAuthor>;
  tallies: ReadonlyMap<string, CommentTally>;
  replyCounts: ReadonlyMap<string, number>;
};

export type PublicComment = {
  id: string;
  parentId: string | null;
  rootId: string | null;
  /** `[removed]` when `removed` is true. */
  content: string;
  /** True for a hidden or removed comment kept only because it has visible replies. */
  removed: boolean;
  createdAt: Date;
  /** null for a deleted, anonymised or unknown author and for a removed comment: show "Member". */
  author: PublicAuthor | null;
  /** Whom this reply answers; null for a top-level comment or when that comment is removed. */
  replyTo: PublicAuthor | null;
  mentions: Array<{ username: string }>;
  likes: number;
  dislikes: number;
  viewerReaction: CommentReactionValue | null;
  /** Visible replies in this conversation (top-level comments only; 0 for a reply). */
  replyCount: number;
  replies: PublicComment[];
  hasMoreReplies: boolean;
  /** Pass to `GET .../comments/:rootId/replies?cursor=` to continue after the embedded replies. */
  nextReplyCursor: string | null;
};

export type CommentPageRecords = {
  total: number;
  /** Every visible comment and reply of the publication. */
  commentTotal: number;
  roots: Array<CommentRecord & { replies: CommentRecord[] }>;
  tallies: Map<string, CommentTally>;
  replyCounts: Map<string, number>;
};

export type ReplyPageRecords = {
  rows: CommentRecord[];
  hasMore: boolean;
  tallies: Map<string, CommentTally>;
};

/** The publication a notification is about. `ownerId` is null once the owner deleted the account. */
export type PublicationNotificationTarget = {
  id: string;
  slug: string;
  ownerId: string | null;
  title: string;
};

export type CreateCommentOutcome =
  | { kind: 'PUBLICATION_NOT_FOUND' }
  | { kind: 'PARENT_NOT_FOUND' }
  | { kind: 'REPLY_LIMIT' }
  | {
      kind: 'CREATED';
      comment: CommentRecord;
      publication: PublicationNotificationTarget;
      /** Author of the comment replied to (null for a top-level comment or an anonymised author). */
      replyToAuthorId: string | null;
    };

export type CommentReactionSummary = {
  likes: number;
  dislikes: number;
  viewerReaction: CommentReactionValue | null;
};

export type CommentReactionOutcome = {
  summary: CommentReactionSummary;
  publication: PublicationNotificationTarget;
  comment: { id: string; authorId: string | null; content: string };
};

/** A Prisma client or the transaction client inside `$transaction`. */
export type CommentDbClient = Prisma.TransactionClient;

export type PublicCommentPage = {
  items: PublicComment[];
  page: number;
  pageSize: number;
  total: number;
  /** Every visible comment and reply, for the comments heading. */
  commentTotal: number;
  totalPages: number;
};

export type PublicReplyPage = {
  items: PublicComment[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Embedded replies of a top-level comment, as the view builder takes them. */
export type CommentViewExtras = {
  replies?: PublicComment[];
  hasMoreReplies?: boolean;
};

/** The comment a reply points at, as read from the database inside the creating transaction. */
export type ReplyTarget = {
  id: string;
  publicationId: string;
  rootId: string | null;
  authorId: string | null;
  status: PublicationCommentStatus;
};

/** Where a reply lives. Always derived on the server, never taken from the client. */
export type ReplyPlacement = {
  parentId: string;
  rootId: string;
  replyToUserId: string | null;
};

export type ReplyCursor = { createdAt: Date; id: string };

export type CommunityActor = { id: string; displayName: string; username: string };

export type CommentNotificationInput = {
  actor: CommunityActor;
  publication: PublicationNotificationTarget;
  commentId: string;
  content: string;
  /** Author of the comment replied to, if any. */
  replyToAuthorId: string | null;
  mentionedUserIds: readonly string[];
};
