import { Locale } from '@/enums/locale.enum';
import { THREAD_LIST_TRANSLATIONS } from '@/lib/i18n/locales/thread-list-translations';
import type { ThreadListLocaleTranslation } from '@/types/thread-list.types';

/** One locale's Threads list strings; an unknown locale reads English. */
export function threadListStrings(locale: string): ThreadListLocaleTranslation {
  const known = Object.values(Locale).find((value) => value === locale);
  return THREAD_LIST_TRANSLATIONS[known ?? Locale.EN];
}

/** Fills `{name}` placeholders. */
export function fillThreadListText(text: string, params?: Record<string, string | number>): string {
  if (params === undefined) {
    return text;
  }
  return Object.entries(params).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    text,
  );
}

/** A created date in the reader's language, e.g. "Oct 31, 2026"; an unreadable value gives "". */
export function formatThreadListDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}
