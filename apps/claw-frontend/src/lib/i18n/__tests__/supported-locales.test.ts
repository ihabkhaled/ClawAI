import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getDictionary } from '@/lib/i18n/translations';

describe('supported locales', () => {
  it('registers a dictionary and explicit compact label for every advertised language', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(13);
    for (const config of SUPPORTED_LOCALES) {
      expect(config.shortLabel.length).toBeGreaterThan(0);
      expect(getDictionary(config.locale)).toBeDefined();
    }
  });

  it('uses the native one-character Arabic indicator', () => {
    const arabic = SUPPORTED_LOCALES.find((config) => config.locale === Locale.AR);
    expect(arabic?.shortLabel).toBe('ع');
  });
});
