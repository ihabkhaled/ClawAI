import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { PICKED_MODEL_TRANSLATIONS } from '@/lib/i18n/locales/picked-model-translations';
import { getTranslation } from '@/lib/i18n/translations';

const KEYS = [
  'failedMessage',
  'fallbackNotice',
  'costlierNote',
  'suggestionsTitle',
  'tryModel',
  'chooseAnother',
] as const;

const PLACEHOLDERS: Record<(typeof KEYS)[number], string[]> = {
  failedMessage: [],
  fallbackNotice: ['{original}', '{answered}'],
  costlierNote: ['{original}', '{answered}'],
  suggestionsTitle: [],
  tryModel: ['{model}'],
  chooseAnother: [],
};

describe('picked-model translations (all 13 locales)', () => {
  it('covers every locale', () => {
    expect(Object.keys(PICKED_MODEL_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale))('%s has every key, with its placeholders, wired in', (locale) => {
    const entry = PICKED_MODEL_TRANSLATIONS[locale];
    const english = PICKED_MODEL_TRANSLATIONS[Locale.EN];
    for (const key of KEYS) {
      expect(entry[key].trim().length).toBeGreaterThan(0);
      for (const placeholder of PLACEHOLDERS[key]) {
        expect(entry[key]).toContain(placeholder);
      }
      if (locale !== Locale.EN) {
        expect(entry[key]).not.toBe(english[key]);
      }
    }
    // And wired into the locale dictionary under the keys the UI asks for.
    for (const key of KEYS) {
      expect(getTranslation(locale, `pickedModel.${key}`)).toBe(entry[key]);
    }
  });
});
