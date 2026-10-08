import { UserNotificationKind } from '@claw/shared-types';

import { AuthEmailKind } from '../../auth/enums/auth-email-kind.enum';
import type { NotificationPreferencesView } from '../types/notifications.types';

/** Notifications per page of the in-app list. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** The most a client may ask for in one page. */
export const NOTIFICATIONS_MAX_PAGE_SIZE = 50;

/** Longest portal link a notification may carry. Matches the column. */
export const NOTIFICATION_LINK_MAX_LENGTH = 300;

/** Longest dedupe key. Matches the column. */
export const NOTIFICATION_DEDUPE_KEY_MAX_LENGTH = 200;

/** A notification carries a few short values (a title), never a document. */
export const NOTIFICATION_MAX_PARAMS = 8;
export const NOTIFICATION_PARAM_VALUE_MAX_LENGTH = 200;

/** An internal portal path: starts with one slash, no scheme, no backslash, no spaces. */
export const NOTIFICATION_LINK_PATTERN = /^\/(?!\/)[A-Za-z0-9\-._~%/?=&#]*$/u;

/** Shown when a published Thread has no title to put in the email. */
export const NOTIFICATION_EMAIL_TITLE_FALLBACK = '—';

/** Which email each kind of notification sends. */
export const NOTIFICATION_EMAIL_KIND: Readonly<Record<UserNotificationKind, AuthEmailKind>> = {
  [UserNotificationKind.THREAD_READY_FOR_REVIEW]: AuthEmailKind.THREAD_READY_FOR_REVIEW,
  [UserNotificationKind.THREAD_PUBLISHED]: AuthEmailKind.THREAD_PUBLISHED,
  [UserNotificationKind.THREAD_FAILED]: AuthEmailKind.THREAD_FAILED,
};

/** What a person gets before they change anything: in-app and email on, push opt-in. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesView = {
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: false,
};
