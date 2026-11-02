import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';

/** The app language a `?lang=` value names, or null: a made-up value never reaches the API. */
export function threadLanguageFromParam(value: string | null): string | null {
  return SUPPORTED_LOCALES.find((entry) => entry.locale === value)?.locale ?? null;
}

/** A language's own name ("Deutsch"), or the code itself when it is not an app language. */
export function threadLanguageName(locale: string): string {
  return SUPPORTED_LOCALES.find((entry) => entry.locale === locale)?.label ?? locale;
}
