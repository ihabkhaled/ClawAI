import { Locale } from '@/enums/locale.enum';
import type { TranslationDictionary } from '@/types/i18n.types';

import { DEFAULT_LOCALE } from './i18n.constants';
import { ar } from './locales/ar';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fa } from './locales/fa';
import { fr } from './locales/fr';
import { hi } from './locales/hi';
import { it } from './locales/it';
import { ja } from './locales/ja';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { th } from './locales/th';
import { zh } from './locales/zh';

const dictionaries: Record<Locale, TranslationDictionary> = {
  [Locale.EN]: en,
  [Locale.AR]: ar,
  [Locale.FR]: fr,
  [Locale.IT]: it,
  [Locale.DE]: de,
  [Locale.ES]: es,
  [Locale.RU]: ru,
  [Locale.PT]: pt,
  [Locale.HI]: hi,
  [Locale.JA]: ja,
  [Locale.TH]: th,
  [Locale.FA]: fa,
  [Locale.ZH]: zh,
};

/**
 * Get a dictionary for a given locale.
 * Falls back to the default locale if the requested locale is not found.
 */
export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/**
 * Resolve a dot-notated translation key (e.g. "common.save") to its value.
 * Supports interpolation of `{key}` placeholders via the `params` map.
 *
 * Falls back to the key string itself if the path cannot be resolved.
 */
export function getTranslation(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = getDictionary(locale);
  const parts = key.split('.');

  if (parts.length < 2) {
    return key;
  }

  let current: unknown = dict;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== 'string') {
    return key;
  }

  if (!params) {
    return current;
  }

  return Object.entries(params).reduce<string>(
    (result, [paramKey, paramValue]) => result.replaceAll(`{${paramKey}}`, String(paramValue)),
    current,
  );
}
