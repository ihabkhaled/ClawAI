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

function flattenDictionary(
  value: unknown,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> {
  if (typeof value === 'string') {
    result[prefix] = value;
    return result;
  }
  if (typeof value !== 'object' || value === null) {
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenDictionary(child, prefix === '' ? key : `${prefix}.${key}`, result);
  }
  return result;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([^}]+)\}/gu)].map((match) => match[1] ?? '').sort();
}

describe('dictionary parity', () => {
  const english = flattenDictionary(getDictionary(Locale.EN));

  it.each(Object.values(Locale))('%s has identical keys and placeholders', (locale) => {
    const localized = flattenDictionary(getDictionary(locale));
    expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      expect(placeholders(localized[key] ?? '')).toEqual(placeholders(english[key] ?? ''));
    }
  });

  it.each([Locale.JA, Locale.TH, Locale.FA, Locale.ZH])(
    '%s translates representative application controls natively',
    (locale) => {
      expect(getTranslation(locale, 'common.save')).not.toBe(
        getTranslation(Locale.EN, 'common.save'),
      );
      expect(getTranslation(locale, 'common.cancel')).not.toBe(
        getTranslation(Locale.EN, 'common.cancel'),
      );
    },
  );

  it.each(Object.values(Locale))('%s localizes structured video errors', (locale) => {
    const providerKey = 'chat.errors.videoAttachmentProviderUnsupported';
    const localModelKey = 'chat.errors.videoAttachmentLocalModelUnavailable';
    const providerMessage = getTranslation(locale, providerKey);
    const localModelMessage = getTranslation(locale, localModelKey);

    expect(providerMessage).not.toBe(providerKey);
    expect(localModelMessage).not.toBe(localModelKey);
    if (locale !== Locale.EN) {
      expect(providerMessage).not.toBe(getTranslation(Locale.EN, providerKey));
      expect(localModelMessage).not.toBe(getTranslation(Locale.EN, localModelKey));
    }
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

  it('returns the key itself when nested key does not resolve', () => {
    expect(getTranslation(Locale.EN, 'nonexistent.nested.key')).toBe('nonexistent.nested.key');
  });

  it('resolves valid nested keys (3+ levels deep)', () => {
    expect(getTranslation(Locale.EN, 'discovery.title')).toBe('Model Discovery');
    expect(getTranslation(Locale.EN, 'discovery.filter.pending')).toBe('Pending');
    expect(getTranslation(Locale.EN, 'discovery.candidates.empty.title')).toBe('No candidates');
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
