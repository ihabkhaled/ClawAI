import type { UserNotificationKind } from '@claw/shared-types';

import type { UserLanguagePreference } from '../../../generated/prisma';
import { AUTH_EMAIL_DICTIONARIES } from '../../auth/email/copy';
import { NOTIFICATION_EMAIL_KIND } from '../constants/notifications.constants';
import type { PushMessagePayload } from '../types/notifications.types';

/**
 * The push text is the localized email subject and preheader, so push needs no strings of its own
 * and never carries a thread title or id. `tag` lets the browser replace a repeat of the same event.
 */
export function buildPushMessage(
  language: UserLanguagePreference,
  kind: UserNotificationKind,
  link: string,
  tag: string,
): PushMessagePayload {
  const copy = AUTH_EMAIL_DICTIONARIES[language].emails[NOTIFICATION_EMAIL_KIND[kind]];
  return {
    title: copy.subject,
    body: copy.preheader,
    link,
    lang: language.toLowerCase(),
    tag,
  };
}
