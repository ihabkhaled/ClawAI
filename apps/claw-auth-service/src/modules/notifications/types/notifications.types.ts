import type { UserNotificationKind } from '@claw/shared-types';

import type { UserLanguagePreference } from '../../../generated/prisma';

/** One notification as the portal shows it. */
export type NotificationView = {
  id: string;
  kind: UserNotificationKind;
  link: string;
  params: Record<string, string>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationView[];
  nextCursor: string | null;
  unreadCount: number;
};

/** Which channels a person wants. In-app and email default on; push is opt-in. */
export type NotificationPreferencesView = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
};

/** What the repository needs to create one notification. */
export type NewNotificationInput = {
  userId: string;
  dedupeKey: string;
  kind: UserNotificationKind;
  link: string;
  params: Record<string, string>;
  /** Already-read when the person turned in-app off: the row still guards against duplicates. */
  readAt: Date | null;
};

/** The few user fields a notification needs. */
export type NotificationRecipientRecord = {
  id: string;
  email: string;
  firstName: string | null;
  languagePreference: UserLanguagePreference;
  isActive: boolean;
  isEmailVerified: boolean;
};

/** A stored row, before it is shaped for the portal. */
export type NotificationRow = {
  id: string;
  kind: string;
  link: string;
  params: unknown;
  readAt: Date | null;
  createdAt: Date;
};
