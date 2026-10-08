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
