import { type Locale } from '@claw/shared-types';

import { type LocalizedText, type PartialTranslationMap } from '../types/catalog.types';

/**
 * Resolves name, summary and description for a locale. Each field falls back
 * to English on its own, so a partly translated entry never shows a blank.
 */
export function localizeTranslations(
  translations: PartialTranslationMap,
  locale: Locale,
): LocalizedText {
  const english = translations.en;
  const wanted = Object.entries(translations).find(([key]) => key === (locale as string))?.[1];
  return {
    name: wanted?.name ?? english.name,
    summary: wanted?.summary ?? english.summary,
    description: wanted?.description ?? english.description,
  };
}
