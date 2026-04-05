import { Locale } from '@/enums/locale.enum';
import type {
  TranslationDictionary,
  TranslationKey,
  TranslationNamespace,
} from '@/types/i18n.types';

import { DEFAULT_LOCALE } from './i18n.constants';
import { ar } from './locales/ar';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { ru } from './locales/ru';

const dictionaries: Record<Locale, TranslationDictionary> = {
  [Locale.EN]: en,
  [Locale.AR]: ar,
  [Locale.FR]: fr,
  [Locale.IT]: it,
  [Locale.DE]: de,
  [Locale.ES]: es,
  [Locale.RU]: ru,
  [Locale.PT]: pt,
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

  if (parts.length !== 2) {
    return key;
  }

  const [namespace, field] = parts as [string, string];

  const section = dict[namespace as TranslationNamespace] as Record<string, string> | undefined;

  if (!section) {
    return key;
  }

  const value = section[field as TranslationKey<TranslationNamespace>];

  if (typeof value !== 'string') {
    return key;
  }

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce<string>(
    (result, [paramKey, paramValue]) => result.replaceAll(`{${paramKey}}`, String(paramValue)),
    value,
  );
}
