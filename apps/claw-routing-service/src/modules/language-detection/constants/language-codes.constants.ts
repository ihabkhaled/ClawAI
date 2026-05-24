// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

export const SUPPORTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'it', 'pt', 'ru'] as const;
export const SUPPORTED_LOCALES_SET = new Set<string>(SUPPORTED_LOCALES);

export const LANGUAGE_CONFIDENCE_THRESHOLD = 0.6;
export const LANGUAGE_FALLBACK = 'en';
export const LANGUAGE_DETECTION_MIN_CHARS = 3;
