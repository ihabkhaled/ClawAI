import { describe, expect, it } from 'vitest';

import {
  MODEL_PRICE_BASIS_HINT_KEYS,
  MODEL_PRICE_BASIS_LABEL_KEYS,
} from '@/constants/model-cost.constants';
import { Locale } from '@/enums/locale.enum';
import { ADMIN_MODEL_COSTS_NEEDS_PRICE_TRANSLATIONS } from '@/lib/i18n/locales/admin-model-costs-needs-price-translations';
import { getTranslation } from '@/lib/i18n/translations';

// The needs-price panel and the basis badge call t() with these keys, some
// through lookup tables the literal-key guard cannot see. A dangling key would
// render `adminModelCosts.unpriced.tab` to an operator.
const unpricedKeys = Object.keys(
  ADMIN_MODEL_COSTS_NEEDS_PRICE_TRANSLATIONS[Locale.EN].unpriced,
).map((key) => `adminModelCosts.unpriced.${key}`);

const ALL_KEYS = [
  ...Object.values(MODEL_PRICE_BASIS_LABEL_KEYS),
  ...Object.values(MODEL_PRICE_BASIS_HINT_KEYS),
  ...unpricedKeys,
];

describe('model cost needs-price keys', () => {
  it.each(ALL_KEYS)('%s resolves in every locale', (key) => {
    for (const locale of Object.values(Locale)) {
      expect(getTranslation(locale, key), `${locale}:${key}`).not.toBe(key);
    }
  });

  it('keeps every placeholder in every locale', () => {
    const en = ADMIN_MODEL_COSTS_NEEDS_PRICE_TRANSLATIONS[Locale.EN].unpriced;
    for (const locale of Object.values(Locale)) {
      const local = ADMIN_MODEL_COSTS_NEEDS_PRICE_TRANSLATIONS[locale].unpriced;
      for (const key of ['summary', 'setPriceFor', 'pageOf'] as const) {
        for (const token of en[key].match(/\{\w+\}/g) ?? []) {
          expect(local[key], `${locale}:${key}`).toContain(token);
        }
      }
    }
  });
});
