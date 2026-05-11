import { describe, expect, it } from 'vitest';

import { formatDateTimeSafe, formatOptionalIsoDate } from '@/utilities/date.utility';

describe('formatDateTimeSafe', () => {
  it('returns fallback when iso is null', () => {
    expect(formatDateTimeSafe(null)).toBe('—');
  });

  it('returns fallback when iso is undefined', () => {
    expect(formatDateTimeSafe(undefined)).toBe('—');
  });

  it('returns fallback when iso is empty string', () => {
    expect(formatDateTimeSafe('')).toBe('—');
  });

  it('returns fallback when iso is unparseable', () => {
    expect(formatDateTimeSafe('not-a-date')).toBe('—');
  });

  it('returns formatted date when iso is valid', () => {
    const iso = '2026-05-09T08:57:57.838Z';
    const formatted = formatDateTimeSafe(iso);
    // Locale string varies, but it must not be the fallback and must be non-empty.
    expect(formatted).not.toBe('—');
    expect(formatted.length).toBeGreaterThan(0);
    // Year is present in any locale rendering of a valid Date#toLocaleString
    expect(formatted).toMatch(/2026/);
  });

  it('honours custom fallback', () => {
    expect(formatDateTimeSafe(null, '(none)')).toBe('(none)');
    expect(formatDateTimeSafe('garbage', '∅')).toBe('∅');
  });
});

describe('formatOptionalIsoDate', () => {
  it('returns em-dash for null', () => {
    expect(formatOptionalIsoDate(null)).toBe('—');
  });

  it('returns a non-empty string for a valid ISO date', () => {
    expect(formatOptionalIsoDate('2026-05-09T08:57:57.838Z').length).toBeGreaterThan(0);
  });
});
