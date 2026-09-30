import { describe, expect, it } from 'vitest';

import { ar } from '@/lib/i18n/locales/ar';
import { en } from '@/lib/i18n/locales/en';
import { zh } from '@/lib/i18n/locales/zh';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';

const KEYS = ['openLabel', 'empty', 'fillDescription', 'deleteConfirm', 'bodyHint', 'insert'];

describe('promptLibrary translations', () => {
  it.each([
    ['en', en],
    ['ar', ar],
    ['zh', zh],
  ])('resolves every key the dialog uses in %s', (_name, dictionary) => {
    for (const key of KEYS) {
      const full = `promptLibrary.${key}`;
      expect(resolveTranslation(dictionary, full)).not.toBe(full);
    }
  });
});
