import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { MODEL_VISIBILITY_TRANSLATIONS } from '@/lib/i18n/locales/model-visibility-translations';

const PLACEHOLDERS: Record<string, string[]> = {
  panelTitle: ['{model}'],
  hiddenSummary: ['{gate}'],
  eventKindChanged: ['{before}', '{after}'],
  exposedNotInChatWarning: ['{models}'],
};

const english = MODEL_VISIBILITY_TRANSLATIONS[Locale.EN];

describe('adminConnectors.visibility translations', () => {
  it.each(Object.values(Locale))('%s has every key, non-empty, with its placeholders', (locale) => {
    const dictionary = MODEL_VISIBILITY_TRANSLATIONS[locale];
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(dictionary)) {
      expect(value.trim(), `${locale}.${key}`).not.toBe('');
      for (const placeholder of PLACEHOLDERS[key] ?? []) {
        expect(value, `${locale}.${key}`).toContain(placeholder);
      }
    }
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s is translated, not English copy',
    (locale) => {
      const dictionary = MODEL_VISIBILITY_TRANSLATIONS[locale];
      expect(dictionary.notInChat).not.toBe(english.notInChat);
      expect(dictionary.panelTitle).not.toBe(english.panelTitle);
      expect(dictionary.exposedNotInChatWarning).not.toBe(english.exposedNotInChatWarning);
    },
  );
});
