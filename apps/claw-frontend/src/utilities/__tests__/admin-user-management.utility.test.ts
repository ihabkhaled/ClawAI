import { describe, expect, it } from 'vitest';

import { PresenceState } from '@/enums/presence-state.enum';
import {
  countryFlagEmoji,
  formatAdminTimestamp,
  formatAdminUserFullName,
  formatCountryLabel,
  formatRegistrationIp,
  isValidAdminPhone,
  resolvePresenceState,
} from '@/utilities/admin-user-management.utility';

const NOW = Date.parse('2026-10-31T12:00:00.000Z');
const ago = (ms: number): string => new Date(NOW - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('resolvePresenceState', () => {
  it('is OFFLINE for a user never seen or with an unreadable date', () => {
    expect(resolvePresenceState(null, NOW)).toBe(PresenceState.OFFLINE);
    expect(resolvePresenceState('not-a-date', NOW)).toBe(PresenceState.OFFLINE);
  });

  it.each([
    [0, PresenceState.ONLINE],
    [5 * MINUTE, PresenceState.ONLINE],
    [5 * MINUTE + 1, PresenceState.RECENT],
    [23 * HOUR, PresenceState.RECENT],
    [24 * HOUR, PresenceState.RECENT],
    [24 * HOUR + 1, PresenceState.OFFLINE],
  ])('seen %i ms ago is %s (same windows as the server)', (age, expected) => {
    expect(resolvePresenceState(ago(age), NOW)).toBe(expected);
  });
});

describe('countryFlagEmoji', () => {
  it('builds the flag from the two letters, either case', () => {
    expect(countryFlagEmoji('EG')).toBe('\u{1F1EA}\u{1F1EC}');
    expect(countryFlagEmoji('us')).toBe('\u{1F1FA}\u{1F1F8}');
  });

  it.each([null, '', 'E', 'EGY', '12', 'E!'])('returns nothing for %s', (code) => {
    expect(countryFlagEmoji(code)).toBe('');
  });
});

describe('formatCountryLabel', () => {
  it('names the country in the reader language with its code', () => {
    expect(formatCountryLabel('EG', 'en')).toBe('Egypt (EG)');
    expect(formatCountryLabel('DE', 'de')).toBe('Deutschland (DE)');
  });

  it('shows a dash when unknown and the bare code when the runtime cannot name it', () => {
    expect(formatCountryLabel(null, 'en')).toBe('-');
    expect(formatCountryLabel('ZZ', 'en')).toMatch(/ZZ/);
  });
});

describe('small formatters', () => {
  it('formats the registration IP or a dash', () => {
    expect(formatRegistrationIp('41.33.1.1')).toBe('41.33.1.1');
    expect(formatRegistrationIp(null)).toBe('-');
    expect(formatRegistrationIp('')).toBe('-');
  });

  it('accepts E.164-ish phones and rejects the rest', () => {
    for (const phone of ['+201001234567', '+14155550123', '+4915112345678']) {
      expect(isValidAdminPhone(phone)).toBe(true);
    }
    for (const phone of [
      '01001234567',
      '+0123456789',
      '+12',
      '+1234567890123456',
      'abc',
      '+20 100',
    ]) {
      expect(isValidAdminPhone(phone)).toBe(false);
    }
  });

  it('joins the name parts and falls back to a dash', () => {
    expect(formatAdminUserFullName({ firstName: 'Ada', lastName: 'Khaled' })).toBe('Ada Khaled');
    expect(formatAdminUserFullName({ firstName: 'Ada', lastName: null })).toBe('Ada');
    expect(formatAdminUserFullName({ firstName: null, lastName: '' })).toBe('-');
  });

  it('formats a timestamp or a dash', () => {
    expect(formatAdminTimestamp(null, 'en')).toBe('-');
    expect(formatAdminTimestamp('nope', 'en')).toBe('-');
    expect(formatAdminTimestamp('2026-10-31T12:00:00.000Z', 'en')).toMatch(/2026/);
  });
});
