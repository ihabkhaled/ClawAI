import { describe, expect, it } from 'vitest';

import {
  MODEL_BILLING_FILTER_LABEL_KEYS,
  MODEL_BILLING_LABEL_KEYS,
  MODEL_BILLING_SOURCE_HINT_KEYS,
} from '@/constants/model-billing.constants';
import {
  CONNECTOR_MODEL_LIFECYCLE_LABEL_KEYS,
  MODEL_EXPOSURE_FILTER_LABEL_KEYS,
  MODEL_EXPOSURE_LABEL_KEYS,
} from '@/constants/model-exposure.constants';
import { Locale } from '@/enums/locale.enum';
import { getTranslation } from '@/lib/i18n/translations';

// Keys reached through constants are invisible to the t('...') scan in
// i18n-key-references.test.ts, so they are resolved here in every locale.
const CONSTANT_KEYS = [
  ...Object.values(MODEL_BILLING_LABEL_KEYS),
  ...Object.values(MODEL_BILLING_SOURCE_HINT_KEYS),
  ...Object.values(MODEL_BILLING_FILTER_LABEL_KEYS),
  ...Object.values(MODEL_EXPOSURE_FILTER_LABEL_KEYS),
  ...Object.values(MODEL_EXPOSURE_LABEL_KEYS),
  ...Object.values(CONNECTOR_MODEL_LIFECYCLE_LABEL_KEYS),
];

describe('credit indicator and exposure panel copy', () => {
  it.each(Object.values(Locale))('resolves every constant-referenced key in %s', (locale) => {
    for (const key of CONSTANT_KEYS) {
      expect(getTranslation(locale, key)).not.toBe(key);
    }
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    'translates the new copy for %s instead of leaking English',
    (locale) => {
      for (const key of [
        'adminModelCosts.billing.help',
        'adminModelCosts.billing.credit',
        'adminConnectors.exposureUi.unexposeConfirmDescription',
        'adminConnectors.exposureUi.emptyDescription',
        'adminConnectors.exposureUi.selectAllLabel',
      ]) {
        expect(getTranslation(locale, key)).not.toBe(getTranslation(Locale.EN, key));
      }
    },
  );

  it('keeps the interpolation placeholders in every locale', () => {
    for (const locale of Object.values(Locale)) {
      expect(getTranslation(locale, 'adminConnectors.exposureUi.shownOf')).toContain('{shown}');
      expect(getTranslation(locale, 'adminConnectors.exposureUi.shownOf')).toContain('{total}');
      expect(getTranslation(locale, 'adminConnectors.exposureUi.selectedCount')).toContain(
        '{count}',
      );
      expect(getTranslation(locale, 'adminModelCosts.billing.editConnectorFor')).toContain(
        '{provider}',
      );
    }
  });
});
