import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { getDictionary, getTranslation } from '@/lib/i18n/translations';

describe('getDictionary', () => {
  it('returns the English dictionary for Locale.EN', () => {
    const dict = getDictionary(Locale.EN);
    expect(dict.common.save).toBe('Save');
  });

  it('returns the Arabic dictionary for Locale.AR', () => {
    const dict = getDictionary(Locale.AR);
    expect(dict).toBeDefined();
    expect(dict.common).toBeDefined();
  });

  it('returns the French dictionary for Locale.FR', () => {
    const dict = getDictionary(Locale.FR);
    expect(dict).toBeDefined();
    expect(dict.common).toBeDefined();
  });
});

describe('getTranslation', () => {
  // ---------- basic lookups ----------

  it('returns the correct value for a valid key', () => {
    expect(getTranslation(Locale.EN, 'common.save')).toBe('Save');
  });

  it('returns the correct value for different namespaces', () => {
    expect(getTranslation(Locale.EN, 'auth.login')).toBe('Login');
    expect(getTranslation(Locale.EN, 'nav.dashboard')).toBe('Dashboard');
    expect(getTranslation(Locale.EN, 'chat.newThread')).toBe('New Chat');
  });

  // ---------- missing keys ----------

  it('returns the key itself when the namespace does not exist', () => {
    expect(getTranslation(Locale.EN, 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns the key itself when the field does not exist in a valid namespace', () => {
    expect(getTranslation(Locale.EN, 'common.nonexistent')).toBe('common.nonexistent');
  });

  it('returns the key itself when key has no dot separator', () => {
    expect(getTranslation(Locale.EN, 'nodot')).toBe('nodot');
  });

  it('returns the key itself when key has more than one dot', () => {
    expect(getTranslation(Locale.EN, 'a.b.c')).toBe('a.b.c');
  });

  it('returns the key for an empty string', () => {
    expect(getTranslation(Locale.EN, '')).toBe('');
  });

  // ---------- interpolation ----------

  it('interpolates a single placeholder', () => {
    const result = getTranslation(Locale.EN, 'validation.tooShort', {
      min: 8,
    });
    expect(result).toBe('Must be at least 8 characters');
  });

  it('interpolates multiple placeholders', () => {
    // tooShort only has {min}, so let's also verify tooLong with {max}
    const result = getTranslation(Locale.EN, 'validation.tooLong', {
      max: 100,
    });
    expect(result).toBe('Must be at most 100 characters');
  });

  it('interpolates string params', () => {
    const result = getTranslation(Locale.EN, 'validation.tooShort', {
      min: '3',
    });
    expect(result).toBe('Must be at least 3 characters');
  });

  it('leaves unmatched placeholders intact when no matching param is provided', () => {
    const result = getTranslation(Locale.EN, 'validation.tooShort', {
      wrongKey: 5,
    });
    expect(result).toBe('Must be at least {min} characters');
  });

  it('returns value without modification when no params are passed and there are no placeholders', () => {
    expect(getTranslation(Locale.EN, 'common.cancel')).toBe('Cancel');
  });

  it('returns value unchanged when params is undefined and value has placeholders', () => {
    expect(getTranslation(Locale.EN, 'validation.tooShort')).toBe(
      'Must be at least {min} characters',
    );
  });

  // ---------- locale fallback ----------

  it('works with different locales', () => {
    // FR dictionary exists and returns a string for common.save
    const result = getTranslation(Locale.FR, 'common.save');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
