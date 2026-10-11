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

/** Web Push endpoints are https URLs on the browser vendor's push service. */
export const PUSH_ENDPOINT_MAX_LENGTH = 1000;
export const PUSH_P256DH_MAX_LENGTH = 200;
export const PUSH_AUTH_MAX_LENGTH = 100;

/** A browser person rarely has more than a few; the cap keeps one account from fanning out forever. */
export const PUSH_MAX_SUBSCRIPTIONS_PER_USER = 10;

/** Seconds the push service may hold an undelivered message (a day: a stale "ready" ping is noise). */
export const PUSH_TTL_SECONDS = 86_400;

/** HTTP statuses a push service uses to say the subscription no longer exists. */
export const PUSH_GONE_STATUS_CODES: readonly number[] = [404, 410];

/** Longest the server waits on one push service before giving up on that browser. */
export const PUSH_SEND_TIMEOUT_MS = 5000;

/**
 * The only hosts a subscription endpoint may point at: the browser vendors' push services. The
 * endpoint comes from the client, so without this list the server would POST to any URL a person
 * supplies (SSRF). A host matches when it equals an entry or is a subdomain of it.
 */
export const PUSH_ALLOWED_HOST_SUFFIXES: readonly string[] = [
  'fcm.googleapis.com',
  // Chrome's older FCM endpoint, still handed out by some channels.
  'jmt17.google.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];
