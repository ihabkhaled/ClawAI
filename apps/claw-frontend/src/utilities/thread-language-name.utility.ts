import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';

/** A language's own name ("Deutsch"), or the code itself when it is not an app language. */
export function threadLanguageName(locale: string): string {
  return SUPPORTED_LOCALES.find((entry) => entry.locale === locale)?.label ?? locale;
}
