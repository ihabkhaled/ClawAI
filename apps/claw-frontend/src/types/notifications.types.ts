import type { UserNotificationKind } from '@claw/shared-types';

/** One notification as auth-service returns it. */
export type NotificationItem = {
  id: string;
  kind: UserNotificationKind;
  /** A portal path starting with `/`, without the language prefix. */
  link: string;
  params: Readonly<Record<string, string>>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
};

export type NotificationPreferences = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
};

export type NotificationPreferencesPatch = Partial<NotificationPreferences>;

/** Whether the server can send push, and the public key a browser needs to subscribe. */
export type PushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

/** A browser subscription reduced to what the server stores. */
export type PushSubscriptionBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** What a row of the bell shows, already in the person's language. */
export type NotificationRowText = {
  kind: UserNotificationKind;
  title: string;
  body: string;
  /** The publication title, when the notification carries one. */
  subject: string | null;
  when: string;
};
