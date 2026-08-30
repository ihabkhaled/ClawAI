import { describe, expect, it } from 'vitest';

import {
  MODEL_COST_CLASS_LABEL_KEYS,
  MODEL_PRICING_SOURCE_FILTER_LABEL_KEYS,
  MODEL_PRICING_SOURCE_LABEL_KEYS,
} from '@/constants/model-cost.constants';
import { Locale } from '@/enums/locale.enum';
import { getTranslation } from '@/lib/i18n/translations';

// These keys reach `t()` through a lookup table, so the repo-wide
// i18n-key-references guard — which only sees literal `t('...')` calls — cannot
// see them. A dangling key here would render `adminModelCosts.source.unpriced`
// as a badge label beside a dollar amount.
const ALL_KEYS = [
  ...Object.values(MODEL_PRICING_SOURCE_LABEL_KEYS),
  ...Object.values(MODEL_PRICING_SOURCE_FILTER_LABEL_KEYS),
  ...Object.values(MODEL_COST_CLASS_LABEL_KEYS),
];

describe('model cost label keys', () => {
  it.each(ALL_KEYS)('%s resolves in every locale', (key) => {
    for (const locale of Object.values(Locale)) {
      expect(getTranslation(locale, key), `${locale}:${key}`).not.toBe(key);
    }
  });
});
