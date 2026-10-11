import { NOTIFICATION_TEXT_KEYS } from '@/constants/notifications.constants';
import type { NotificationItem, NotificationRowText } from '@/types/notifications.types';

const SECOND_MS = 1000;
const MINUTE_S = 60;
const HOUR_S = 3600;
const DAY_S = 86_400;
/** Past this, a relative time ("5 weeks ago") reads worse than a date. */
const RELATIVE_LIMIT_DAYS = 30;

/**
 * "2 minutes ago", in the reader's language. Falls back to a plain date after a month, and to
 * the date alone if the browser lacks `Intl.RelativeTimeFormat`.
 */
export function formatNotificationTime(iso: string, locale: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return '';
  }
  const seconds = Math.round((then - now) / SECOND_MS);
  const absolute = Math.abs(seconds);
  const date = new Date(then);
  if (absolute >= RELATIVE_LIMIT_DAYS * DAY_S || typeof Intl.RelativeTimeFormat === 'undefined') {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  }
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (absolute < MINUTE_S) {
    return formatter.format(Math.min(seconds, 0), 'second');
  }
  if (absolute < HOUR_S) {
    return formatter.format(Math.round(seconds / MINUTE_S), 'minute');
  }
  if (absolute < DAY_S) {
    return formatter.format(Math.round(seconds / HOUR_S), 'hour');
  }
  return formatter.format(Math.round(seconds / DAY_S), 'day');
}

/** The words a row shows: the kind's title and body in the person's language, plus any title. */
export function buildNotificationRowText(
  item: NotificationItem,
  t: (key: string) => string,
  locale: string,
  now: number,
): NotificationRowText {
  const keys = NOTIFICATION_TEXT_KEYS[item.kind];
  const subject = item.params['title'];
  return {
    title: t(keys.titleKey),
    body: t(keys.bodyKey),
    subject: subject === undefined || subject.length === 0 ? null : subject,
    when: formatNotificationTime(item.createdAt, locale, now),
  };
}
