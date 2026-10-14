import { PublicationCommentStatus } from '../../../generated/prisma';
import { COMMENT_REMOVED_PLACEHOLDER } from '../constants/publication-comments.constants';
import type {
  CommentLookup,
  CommentRecord,
  CommentViewExtras,
  PublicComment,
} from '../types/publication-comments.types';
import { encodeReplyCursor } from './reply-cursor.utility';

/** Every id of a person this record needs a name for. */
export function recordPersonIds(record: CommentRecord): string[] {
  return record.status === PublicationCommentStatus.VISIBLE
    ? [record.authorId, record.replyToUserId].filter((id): id is string => id !== null)
    : [];
}

/**
 * Shapes one stored comment for readers. A comment that is not VISIBLE shows only the placeholder
 * (it is returned at all only because visible replies hang under it): no text, author, mentions or
 * votes. `replyTo` is dropped when the comment replied to is no longer visible, so a removed
 * comment's author is not revealed through its replies. Email and ids are never part of the view.
 */
export function toCommentView(
  record: CommentRecord,
  lookup: CommentLookup,
  extras: CommentViewExtras = {},
): PublicComment {
  const removed = record.status !== PublicationCommentStatus.VISIBLE;
  const tally = lookup.tallies.get(record.id);
  const replies = extras.replies ?? [];
  const last = replies.at(-1);
  const replyToVisible =
    record.parent !== null && record.parent.status === PublicationCommentStatus.VISIBLE;
  return {
    id: record.id,
    parentId: record.parentId,
    rootId: record.rootId,
    content: removed ? COMMENT_REMOVED_PLACEHOLDER : record.content,
    removed,
    createdAt: record.createdAt,
    author:
      removed || record.authorId === null ? null : (lookup.authors.get(record.authorId) ?? null),
    replyTo:
      removed || !replyToVisible || record.replyToUserId === null
        ? null
        : (lookup.authors.get(record.replyToUserId) ?? null),
    mentions: removed ? [] : record.mentions.map(({ username }) => ({ username })),
    likes: removed ? 0 : (tally?.likes ?? 0),
    dislikes: removed ? 0 : (tally?.dislikes ?? 0),
    viewerReaction: removed ? null : (tally?.viewerReaction ?? null),
    replyCount: lookup.replyCounts.get(record.id) ?? 0,
    replies,
    hasMoreReplies: extras.hasMoreReplies ?? false,
    nextReplyCursor: extras.hasMoreReplies === true && last ? encodeReplyCursor(last) : null,
  };
}
