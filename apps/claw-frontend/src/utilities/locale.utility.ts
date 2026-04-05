import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, RTL_LOCALES } from '@/lib/i18n/i18n.constants';

export function isValidLocale(value: unknown): value is Locale {
  return Object.values(Locale).includes(value as Locale);
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored !== null && isValidLocale(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private browsing, SSR, etc.)
  }

  return DEFAULT_LOCALE;
}

export function getDirection(locale: Locale): Direction {
  return RTL_LOCALES.includes(locale) ? Direction.RTL : Direction.LTR;
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable
  }
}
