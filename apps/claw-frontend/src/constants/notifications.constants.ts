import { UserNotificationKind } from '@claw/shared-types';

/** Auth-service serves notifications under its own nginx location. */
export const NOTIFICATIONS_API_BASE = '/notifications';

/** How many notifications one page of the bell holds. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * The unread badge is refreshed this often while the tab is visible and on window focus. It is a
 * single small request; a hidden tab does not poll at all.
 */
export const NOTIFICATIONS_UNREAD_POLL_MS = 60_000;

export const NOTIFICATIONS_STALE_MS = 30_000;

/** Web Push routes, under the same auth-service location as the rest. */
export const NOTIFICATIONS_PUSH_CONFIG_PATH = `${NOTIFICATIONS_API_BASE}/push/config`;
export const NOTIFICATIONS_PUSH_SUBSCRIPTIONS_PATH = `${NOTIFICATIONS_API_BASE}/push/subscriptions`;

/** The badge shows this and above as "99+". */
export const NOTIFICATIONS_MAX_BADGE = 99;

/** The in-app route that holds the notification settings card. */
export const NOTIFICATIONS_SETTINGS_PATH = '/settings';

/** Where a notification's title and body words live in the translation dictionary. */
export const NOTIFICATION_TEXT_KEYS: Readonly<
  Record<UserNotificationKind, { titleKey: string; bodyKey: string }>
> = {
  [UserNotificationKind.THREAD_READY_FOR_REVIEW]: {
    titleKey: 'notifications.kinds.THREAD_READY_FOR_REVIEW.title',
    bodyKey: 'notifications.kinds.THREAD_READY_FOR_REVIEW.body',
  },
  [UserNotificationKind.THREAD_PUBLISHED]: {
    titleKey: 'notifications.kinds.THREAD_PUBLISHED.title',
    bodyKey: 'notifications.kinds.THREAD_PUBLISHED.body',
  },
  [UserNotificationKind.THREAD_FAILED]: {
    titleKey: 'notifications.kinds.THREAD_FAILED.title',
    bodyKey: 'notifications.kinds.THREAD_FAILED.body',
  },
  [UserNotificationKind.THREAD_COMMENTED]: {
    titleKey: 'notifications.kinds.THREAD_COMMENTED.title',
    bodyKey: 'notifications.kinds.THREAD_COMMENTED.body',
  },
  [UserNotificationKind.THREAD_COMMENT_REPLIED]: {
    titleKey: 'notifications.kinds.THREAD_COMMENT_REPLIED.title',
    bodyKey: 'notifications.kinds.THREAD_COMMENT_REPLIED.body',
  },
  [UserNotificationKind.THREAD_MENTIONED]: {
    titleKey: 'notifications.kinds.THREAD_MENTIONED.title',
    bodyKey: 'notifications.kinds.THREAD_MENTIONED.body',
  },
  [UserNotificationKind.THREAD_REACTED]: {
    titleKey: 'notifications.kinds.THREAD_REACTED.title',
    bodyKey: 'notifications.kinds.THREAD_REACTED.body',
  },
  [UserNotificationKind.THREAD_COMMENT_REACTED]: {
    titleKey: 'notifications.kinds.THREAD_COMMENT_REACTED.title',
    bodyKey: 'notifications.kinds.THREAD_COMMENT_REACTED.body',
  },
  [UserNotificationKind.THREAD_CHANGE_REQUESTED]: {
    titleKey: 'notifications.kinds.THREAD_CHANGE_REQUESTED.title',
    bodyKey: 'notifications.kinds.THREAD_CHANGE_REQUESTED.body',
  },
  [UserNotificationKind.MCP_SERVER_APPROVED]: {
    titleKey: 'notifications.kinds.MCP_SERVER_APPROVED.title',
    bodyKey: 'notifications.kinds.MCP_SERVER_APPROVED.body',
  },
  [UserNotificationKind.MCP_SERVER_REJECTED]: {
    titleKey: 'notifications.kinds.MCP_SERVER_REJECTED.title',
    bodyKey: 'notifications.kinds.MCP_SERVER_REJECTED.body',
  },
};
