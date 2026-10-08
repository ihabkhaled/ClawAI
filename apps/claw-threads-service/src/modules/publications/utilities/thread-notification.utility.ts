import { NOTIFICATION_TITLE_MAX_LENGTH } from '../constants/thread-notification.constants';

/** Where the owner reviews, approves or reads about a generation. */
export function reviewLink(publicationId: string): string {
  return `/threads/review/${encodeURIComponent(publicationId)}`;
}

/** The public article page. */
export function publicLink(slug: string): string {
  return `/threads/${encodeURIComponent(slug)}`;
}

/** A title short enough for a notification line; empty text stays empty. */
export function notificationTitle(title: string): string {
  const clean = title.replaceAll(/\s+/gu, ' ').trim();
  return clean.length > NOTIFICATION_TITLE_MAX_LENGTH
    ? `${clean.slice(0, NOTIFICATION_TITLE_MAX_LENGTH - 1)}…`
    : clean;
}
