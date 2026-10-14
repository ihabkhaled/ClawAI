import type { PluginsTranslate } from '@/types/plugins.types';

/**
 * A counted phrase in the plural form the language needs ("1 file", "2 files"; six forms in Arabic).
 * The form comes from `Intl.PluralRules`; a language that lacks that form in the dictionary falls back to `other`.
 */
export function pluralText(
  t: PluginsTranslate,
  locale: string,
  base: string,
  count: number,
): string {
  const form = new Intl.PluralRules(locale).select(count);
  const key = `${base}.${form}`;
  const text = t(key, { count });
  return text === key ? t(`${base}.other`, { count }) : text;
}
