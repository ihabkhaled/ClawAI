import { UserNotificationKind } from '@claw/shared-types';

import type { NotificationRow, NotificationView } from '../types/notifications.types';

/** Keeps only string values: a stored `params` column is JSON and is not trusted blindly. */
export function toStringParams(value: unknown): Record<string, string> {
  return typeof value !== 'object' || value === null || Array.isArray(value) ? {} : Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/** Whether a stored kind is one this build knows. */
export function isNotificationKind(kind: string): kind is UserNotificationKind {
  return (Object.values(UserNotificationKind) as string[]).includes(kind);
}

/** Shapes a row for the portal. A row of an unknown kind (an older or newer build) is dropped. */
export function toNotificationView(row: NotificationRow): NotificationView | null {
  if (!isNotificationKind(row.kind)) {
    return null;
  }
  return {
    id: row.id,
    kind: row.kind,
    link: row.link,
    params: toStringParams(row.params),
    readAt: row.readAt === null ? null : row.readAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
