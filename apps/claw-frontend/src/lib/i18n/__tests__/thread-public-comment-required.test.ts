import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { getTranslation } from '@/lib/i18n/translations';

const KEY = 'chat.threadPublicCommentRequired';
const english = getTranslation(Locale.EN, KEY);

describe('chat.threadPublicCommentRequired', () => {
  it('has English text', () => {
    expect(english).toBe('Write a comment before posting.');
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has a real translation, not the English fallback',
    (locale) => {
      const text = getTranslation(locale, KEY);
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toBe(english);
    },
  );
});
