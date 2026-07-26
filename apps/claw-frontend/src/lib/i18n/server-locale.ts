import type { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getTranslation } from '@/lib/i18n/translations';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * Picks a locale from an `Accept-Language` header.
 *
 * The client-side locale lives in localStorage, which a server render cannot see,
 * and the public shared-chat page has to emit real text server-side — a crawler
 * that receives an untranslated shell is a crawler that indexes nothing useful.
 * `Accept-Language` is the only locale signal available at that point.
 *
 * Quality values are honoured in order but not weighted: browsers send their
 * preferences highest-first, so first-supported-match is the same answer with less
 * machinery. An unrecognised or absent header falls back to English rather than
 * guessing.
 */
export function resolveLocaleFromAcceptLanguage(header: string | null): Locale {
  if (header === null || header.trim() === '') {
    return DEFAULT_LOCALE;
  }

  const requested = header
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase() ?? '')
    .filter((tag) => tag.length > 0);

  for (const tag of requested) {
    // Match the primary subtag, so `de-AT` resolves to `de` and `pt-BR` to `pt`.
    const primary = tag.split('-')[0] ?? '';
    const match = SUPPORTED_LOCALES.find((entry) => entry.locale === primary);
    if (match !== undefined) {
      return match.locale;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * A `t()` bound to one locale, for use in server components.
 *
 * Same signature as the client hook's `t` so a component or utility can take a
 * `TranslateFunction` and work on either side without knowing which it got.
 */
export function createServerTranslator(locale: Locale): TranslateFunction {
  return (key: string, params?: Record<string, string | number>): string =>
    getTranslation(locale, key, params);
}
