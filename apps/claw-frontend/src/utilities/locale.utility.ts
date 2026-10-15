import {
  HTML_LANGUAGE_BY_LOCALE,
  OPEN_GRAPH_LOCALE_BY_LOCALE,
} from '@/constants/locale-metadata.constants';
import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, RTL_LOCALES } from '@/lib/i18n/i18n.constants';

export function isValidLocale(value: unknown): value is Locale {
  return Object.values(Locale).includes(value as Locale);
}

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && isValidLocale(value.toLowerCase());
}

export function normalizeBrowserLocale(value: string): Locale | null {
  const primary = value.trim().toLowerCase().split('-')[0];
  return isSupportedLocale(primary) ? primary : null;
}

export function parseLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split('/')[1];
  return isSupportedLocale(segment) ? (segment.toLowerCase() as Locale) : null;
}

export function stripLocaleFromPathname(pathname: string): string {
  if (parseLocaleFromPathname(pathname) === null) {
    return pathname;
  }
  const stripped = pathname.replace(/^\/[^/]+/u, '');
  return stripped === '' ? '/' : stripped;
}

export function localisePath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return `/${locale}`;
  }
  const url = new URL(path, 'https://claw.local');
  const pathname = stripLocaleFromPathname(url.pathname);
  const localizedPathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
  return `${localizedPathname}${url.search}${url.hash}`;
}

/** `path` in `locale`; the path as given when the locale is not a supported one (never `/undefined/...`). */
export function localizeHref(path: string, locale: unknown): string {
  return isValidLocale(locale) ? localisePath(path, locale) : path;
}

/** `path` under the locale of the page the reader is on; a path that names a locale already stays as is. */
export function withLocaleOf(path: string, currentPathname: string): string {
  const locale = parseLocaleFromPathname(currentPathname);
  if (locale === null || !path.startsWith('/') || parseLocaleFromPathname(path) !== null) {
    return path;
  }
  return localisePath(path, locale);
}

export function replacePathLocale(path: string, locale: Locale): string {
  return localisePath(path, locale);
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

export function getLocaleDirection(locale: Locale): Direction {
  return getDirection(locale);
}

export function getHtmlLanguage(locale: Locale): string {
  return HTML_LANGUAGE_BY_LOCALE[locale];
}

export function getOpenGraphLocale(locale: Locale): string {
  return OPEN_GRAPH_LOCALE_BY_LOCALE[locale];
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable
  }
}
