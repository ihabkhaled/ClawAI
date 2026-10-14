import type { UserNotificationKind } from '../enums/user-notification-kind.enum';

/**
 * One notification for one user. It carries no sentence: the receiver picks the words from
 * `kind` in the user's own language. `params` holds only short, non-secret values (a title).
 */
export interface UserNotificationRequestedPayload {
  /** Same key = same notification. A redelivered event never makes a second one. */
  dedupeKey: string;
  userId: string;
  kind: UserNotificationKind;
  /** A path inside the portal, starting with `/`. */
  link: string;
  params: Record<string, string>;
}

/**
 * The `params` of the Threads community kinds (THREAD_COMMENTED, THREAD_COMMENT_REPLIED,
 * THREAD_MENTIONED, THREAD_REACTED, THREAD_COMMENT_REACTED, THREAD_CHANGE_REQUESTED). All values
 * are short single-line strings; they are plain text, never HTML, and must be escaped on render.
 * `actorName` may be an empty string when the name could not be looked up: render a generic
 * "Someone". The link is the Thread page; comment kinds end in `#comment-<commentId>`.
 */
export interface ThreadCommunityNotificationParams {
  /** Display name of the person who acted (first + last name, else username). Max 100 chars. */
  actorName: string;
  actorUsername: string;
  /** Thread title, cleaned and cut to 120 chars. */
  title: string;
  /** First 120 chars of the comment or suggestion, one line. Empty for reactions. */
  excerpt: string;
}
