import { describe, expect, it } from 'vitest';

import {
  detectCountryFromE164,
  flagEmojiFromIso2,
  isE164,
  parseE164,
  toE164,
} from '@/utilities/phone.utility';

describe('phone utilities', () => {
  it('creates a flag emoji from an ISO-2 code', () => {
    expect(flagEmojiFromIso2('US')).toBe('🇺🇸');
  });

  it('normalizes a national number to E.164', () => {
    expect(toE164('+20', '010 123 4567')).toBe('+20101234567');
  });

  it('validates the E.164 shape', () => {
    expect(isE164('+201234567890')).toBe(true);
    for (const value of ['00201234567', '+0123', '12345', '']) {
      expect(isE164(value)).toBe(false);
    }
  });

  it('uses the valid longest dial-code match without inventing a prefix', () => {
    expect(detectCountryFromE164('+11234567890')?.iso2).toBe('US');
    expect(parseE164('+11234567890')).toEqual({
      dialCode: '+1',
      nationalNumber: '1234567890',
    });
  });

  it('returns null for invalid input', () => {
    expect(parseE164('garbage')).toBeNull();
  });
});
