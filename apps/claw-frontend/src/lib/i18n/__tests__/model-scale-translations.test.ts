import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { MODEL_SCALE_TRANSLATIONS } from '@/lib/i18n/locales/model-scale-translations';
import { getTranslation } from '@/lib/i18n/translations';

const KEYS = ['context', 'parameters', 'activeNote', 'parametersLabel'] as const;

// `{value}` is the formatted number the utility substitutes; a translation that drops it
// would print the words with no number beside them.
const NEEDS_VALUE: Record<(typeof KEYS)[number], boolean> = {
  context: true,
  parameters: true,
  activeNote: true,
  parametersLabel: false,
};

describe('model-scale translations (all 13 locales, ADR-234)', () => {
  it('covers every locale', () => {
    expect(Object.keys(MODEL_SCALE_TRANSLATIONS).sort()).toEqual(Object.values(Locale).sort());
  });

  it.each(Object.values(Locale))('%s has every key, with its placeholder, wired in', (locale) => {
    const entry = MODEL_SCALE_TRANSLATIONS[locale];
    const english = MODEL_SCALE_TRANSLATIONS[Locale.EN];
    for (const key of KEYS) {
      expect(entry[key].trim().length).toBeGreaterThan(0);
      if (NEEDS_VALUE[key]) {
        expect(entry[key]).toContain('{value}');
      }
      if (locale !== Locale.EN) {
        expect(entry[key]).not.toBe(english[key]);
      }
      expect(getTranslation(locale, `modelScale.${key}`)).toBe(entry[key]);
    }
  });

  it('never translates the unit letters: the number and its K / M / B / T come from the formatter', () => {
    for (const locale of Object.values(Locale)) {
      for (const key of KEYS) {
        expect(MODEL_SCALE_TRANSLATIONS[locale][key]).not.toMatch(/\d/);
      }
    }
  });
});
