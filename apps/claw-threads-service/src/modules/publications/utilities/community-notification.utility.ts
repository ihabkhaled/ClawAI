import {
  type ThreadCommunityNotificationParams,
  UserNotificationKind,
  type UserNotificationRequestedPayload,
} from '@claw/shared-types';

import {
  NOTIFICATION_ACTOR_NAME_MAX_LENGTH,
  NOTIFICATION_EXCERPT_MAX_LENGTH,
} from '../constants/publication-comments.constants';
import type {
  CommentNotificationInput,
  CommentReactionValue,
  CommunityActor,
  PublicationNotificationTarget,
} from '../types/publication-comments.types';
import { notificationTitle, publicLink } from './thread-notification.utility';

/** Single-line, trimmed, cut on a character boundary at `max` characters (not UTF-16 units). */
export function singleLine(text: string, max: number): string {
  const clean = text.replaceAll(/\s+/gu, ' ').trim();
  const characters = [...clean];
  return characters.length > max ? `${characters.slice(0, max - 1).join('')}…` : clean;
}

export function commentExcerpt(content: string): string {
  return singleLine(content, NOTIFICATION_EXCERPT_MAX_LENGTH);
}

/** The Thread page scrolled to one comment. */
export function commentLink(slug: string, commentId: string): string {
  return `${publicLink(slug)}#comment-${encodeURIComponent(commentId)}`;
}

function paramsFor(
  actor: CommunityActor,
  publication: PublicationNotificationTarget,
  excerpt: string,
): ThreadCommunityNotificationParams {
  return {
    actorName: singleLine(actor.displayName, NOTIFICATION_ACTOR_NAME_MAX_LENGTH),
    actorUsername: actor.username,
    title: notificationTitle(publication.title),
    excerpt,
  };
}

/**
 * Who hears about a new comment, at most once each, never the person who wrote it:
 * the author of the comment replied to (THREAD_COMMENT_REPLIED), else the owner
 * (THREAD_COMMENTED), else a mentioned person (THREAD_MENTIONED). So someone who is both replied-to
 * and mentioned gets the reply notice only, and an owner who is replied-to gets one notice. Keys are
 * `comment:<id>:<kind>:<recipient>`, so a redelivery is harmless.
 */
export function planCommentNotifications(
  input: CommentNotificationInput,
): UserNotificationRequestedPayload[] {
  const params = paramsFor(input.actor, input.publication, commentExcerpt(input.content));
  const link = commentLink(input.publication.slug, input.commentId);
  const notified = new Set<string>([input.actor.id]);
  const payloads: UserNotificationRequestedPayload[] = [];
  const add = (userId: string | null, kind: UserNotificationKind): void => {
    if (userId === null || notified.has(userId)) return;
    notified.add(userId);
    payloads.push({
      dedupeKey: `comment:${input.commentId}:${kind}:${userId}`,
      userId,
      kind,
      link,
      params: { ...params },
    });
  };
  add(input.replyToAuthorId, UserNotificationKind.THREAD_COMMENT_REPLIED);
  add(input.publication.ownerId, UserNotificationKind.THREAD_COMMENTED);
  for (const userId of input.mentionedUserIds) {
    add(userId, UserNotificationKind.THREAD_MENTIONED);
  }
  return payloads;
}

/**
 * A like or dislike of the Thread, to its owner. Told only for a LIKE, or for the first reaction a
 * person ever leaves, so flipping like/dislike does not keep pinging. One key per actor and
 * Thread: toggling never creates a second notification.
 */
export function planThreadReaction(input: {
  actor: CommunityActor;
  publication: PublicationNotificationTarget;
  value: CommentReactionValue;
  previous: CommentReactionValue | null;
}): UserNotificationRequestedPayload | null {
  const { actor, publication } = input;
  if (publication.ownerId === null || publication.ownerId === actor.id) return null;
  if (input.value !== 'LIKE' && input.previous !== null) return null;
  return {
    dedupeKey: `thread-reacted:${publication.id}:${actor.id}`,
    userId: publication.ownerId,
    kind: UserNotificationKind.THREAD_REACTED,
    link: publicLink(publication.slug),
    params: { ...paramsFor(actor, publication, '') },
  };
}

/** A like of a comment, to its author. Dislikes are never announced. */
export function planCommentReaction(input: {
  actor: CommunityActor;
  publication: PublicationNotificationTarget;
  comment: { id: string; authorId: string | null; content: string };
  value: CommentReactionValue;
}): UserNotificationRequestedPayload | null {
  const { actor, comment, publication } = input;
  if (input.value !== 'LIKE' || comment.authorId === null || comment.authorId === actor.id) {
    return null;
  }
  return {
    dedupeKey: `comment-reacted:${comment.id}:${actor.id}`,
    userId: comment.authorId,
    kind: UserNotificationKind.THREAD_COMMENT_REACTED,
    link: commentLink(publication.slug, comment.id),
    params: { ...paramsFor(actor, publication, commentExcerpt(comment.content)) },
  };
}

/** A suggested change, to the owner. */
export function planChangeRequest(input: {
  actor: CommunityActor;
  publication: PublicationNotificationTarget;
  requestId: string;
  suggestion: string;
}): UserNotificationRequestedPayload | null {
  const { actor, publication } = input;
  if (publication.ownerId === null || publication.ownerId === actor.id) return null;
  return {
    dedupeKey: `change-requested:${input.requestId}`,
    userId: publication.ownerId,
    kind: UserNotificationKind.THREAD_CHANGE_REQUESTED,
    link: publicLink(publication.slug),
    params: { ...paramsFor(actor, publication, commentExcerpt(input.suggestion)) },
  };
}
