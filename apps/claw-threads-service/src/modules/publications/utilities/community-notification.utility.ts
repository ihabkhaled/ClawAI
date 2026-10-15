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
import { ChangeRequestDecision } from '../../../common/enums/change-request-decision.enum';
import type { ChangeDecisionContext } from '../types/publication-community.types';
import { notificationTitle, publicLink, reviewLink } from './thread-notification.utility';

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

/** The owner's review screen for one Thread, scrolled to one suggestion. */
export function ownerChangeRequestLink(publicationId: string, requestId: string): string {
  return `${reviewLink(publicationId)}#change-request-${encodeURIComponent(requestId)}`;
}

/** The requester's "My suggestions" screen, scrolled to one suggestion. */
export function mySuggestionsLink(requestId: string): string {
  return `/threads/my/suggestions#change-request-${encodeURIComponent(requestId)}`;
}

/** A suggested change, to the owner, linking straight to the review screen with it highlighted. */
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
    link: ownerChangeRequestLink(publication.id, input.requestId),
    params: { ...paramsFor(actor, publication, commentExcerpt(input.suggestion)) },
  };
}

function decisionKind(outcome: ChangeRequestDecision): UserNotificationKind {
  switch (outcome) {
    case ChangeRequestDecision.ACCEPTED:
      return UserNotificationKind.THREAD_CHANGE_ACCEPTED;
    case ChangeRequestDecision.APPLIED:
      return UserNotificationKind.THREAD_CHANGE_APPLIED;
    case ChangeRequestDecision.DECLINED:
      return UserNotificationKind.THREAD_CHANGE_DECLINED;
  }
}

/**
 * What the owner decided, told to the person who suggested it. Accepted and declined open "My
 * suggestions" on that suggestion; applied opens the Thread, which now credits them. One key per
 * request and outcome, so a repeated decision or a second publish tells them once.
 */
export function planChangeDecision(input: {
  outcome: ChangeRequestDecision;
  owner: CommunityActor;
  context: ChangeDecisionContext;
}): UserNotificationRequestedPayload | null {
  const { context, outcome, owner } = input;
  if (context.requesterId === null || context.requesterId === owner.id) return null;
  return {
    dedupeKey: `change-${outcome.toLowerCase()}:${context.requestId}`,
    userId: context.requesterId,
    kind: decisionKind(outcome),
    link:
      outcome === ChangeRequestDecision.APPLIED
        ? publicLink(context.publication.slug)
        : mySuggestionsLink(context.requestId),
    params: {
      actorName: singleLine(owner.displayName, NOTIFICATION_ACTOR_NAME_MAX_LENGTH),
      actorUsername: owner.username,
      title: notificationTitle(context.publication.title),
      excerpt: commentExcerpt(context.suggestion),
    },
  };
}
