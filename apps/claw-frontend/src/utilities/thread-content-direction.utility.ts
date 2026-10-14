import { RTL_LOCALES } from '@/lib/i18n/i18n.constants';

/** Reading direction of a Thread's own language, independent of the page's UI locale. */
export function threadContentDirection(contentLocale: string): 'rtl' | 'ltr' {
  return RTL_LOCALES.some((locale) => String(locale) === contentLocale) ? 'rtl' : 'ltr';
}
