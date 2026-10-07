import { THREADS_MARKETING_CONTENT_BY_LOCALE } from '@/constants/threads-marketing-content.constants';
import type { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

/**
 * The Threads page copy for one locale. Falls back to English only if a locale is somehow
 * missing from the record, which the type system already prevents, so a bad runtime locale
 * string renders a page rather than throwing.
 */
export function getThreadsMarketingContent(locale: Locale): ThreadsMarketingDictionary {
  return (
    THREADS_MARKETING_CONTENT_BY_LOCALE[locale] ??
    THREADS_MARKETING_CONTENT_BY_LOCALE[DEFAULT_LOCALE]
  );
}
