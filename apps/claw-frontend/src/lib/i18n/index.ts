// The CLIENT-facing i18n surface. It deliberately does NOT re-export
// `./translations`.
//
// That module statically imports all 13 dictionaries — 5 MB of source — and
// this barrel is imported by nearly every client component for `useTranslation`.
// Re-exporting it here put every language into the shared client chunk, so a
// visitor reading English downloaded Arabic, Thai, Japanese and ten more: 1,364
// KiB transferred, whose evaluation was 91% of mobile LCP as render delay.
//
// Nothing on the client needs them. The server picks ONE dictionary per request
// (`dictionary-loader.ts`, which imports dynamically) and hands it to
// LocaleProvider, and `useTranslation` resolves against that. Server code that
// genuinely needs the lookup table imports `./translations` directly.
//
// Guarded by __tests__/i18n-client-barrel.test.ts.
export { useLocale } from '@/hooks/use-locale';

export { LocaleContext, LocaleProvider } from './locale-context';
export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
} from './i18n.constants';
export { useTranslation } from './use-translation';
