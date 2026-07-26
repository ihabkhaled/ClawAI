import type { TranslationDictionary } from '@/types/i18n.types';

export function resolveTranslation(
  dictionary: TranslationDictionary,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  if (parts.length < 2) {
    return key;
  }

  let current: unknown = dictionary;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== 'string') {
    return key;
  }
  if (params === undefined) {
    return current;
  }

  return Object.entries(params).reduce<string>(
    (result, [paramKey, paramValue]) => result.replaceAll(`{${paramKey}}`, String(paramValue)),
    current,
  );
}
