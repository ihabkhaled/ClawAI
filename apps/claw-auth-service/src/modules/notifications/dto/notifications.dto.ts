import { UserNotificationKind } from '@claw/shared-types';
import { z } from 'zod';

import {
  NOTIFICATION_DEDUPE_KEY_MAX_LENGTH,
  NOTIFICATION_LINK_MAX_LENGTH,
  NOTIFICATION_LINK_PATTERN,
  NOTIFICATION_MAX_PARAMS,
  NOTIFICATION_PARAM_VALUE_MAX_LENGTH,
  NOTIFICATIONS_MAX_PAGE_SIZE,
  NOTIFICATIONS_PAGE_SIZE,
} from '../constants/notifications.constants';

/**
 * The event another service sends to say "tell this user". Validated here because the broker is
 * a trust boundary: a bad link or an unknown kind is dropped, never stored.
 */
export const userNotificationRequestedSchema = z
  .object({
    dedupeKey: z.string().min(1).max(NOTIFICATION_DEDUPE_KEY_MAX_LENGTH),
    userId: z.string().min(1).max(64),
    kind: z.nativeEnum(UserNotificationKind),
    link: z.string().max(NOTIFICATION_LINK_MAX_LENGTH).regex(NOTIFICATION_LINK_PATTERN),
    params: z
      .record(z.string(), z.string().max(NOTIFICATION_PARAM_VALUE_MAX_LENGTH))
      .refine((record) => Object.keys(record).length <= NOTIFICATION_MAX_PARAMS),
  })
  .strict();
export type UserNotificationRequestedDto = z.infer<typeof userNotificationRequestedSchema>;

/** Cursor paging, like the credit ledger: an opaque row id, never an offset. */
export const notificationListQuerySchema = z.object({
  cursor: z.string().min(1).max(64).nullish(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(NOTIFICATIONS_MAX_PAGE_SIZE)
    .default(NOTIFICATIONS_PAGE_SIZE),
});
export type NotificationListQueryDto = z.infer<typeof notificationListQuerySchema>;

export const notificationIdParamSchema = z.object({ id: z.string().min(1).max(64) });
export type NotificationIdParamDto = z.infer<typeof notificationIdParamSchema>;

/** Any subset of the channels; at least one. Unknown fields are rejected. */
export const notificationPreferencesSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one channel' });
export type NotificationPreferencesDto = z.infer<typeof notificationPreferencesSchema>;
