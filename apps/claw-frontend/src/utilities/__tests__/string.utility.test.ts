import { describe, expect, it } from 'vitest';

import { getInitials } from '@/utilities/string.utility';

describe('getInitials', () => {
  it('returns two-letter initials from a full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns a single letter for a single-word name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('returns at most two initials even for longer names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MJ');
  });

  it('returns uppercase initials for lowercase input', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });

  it('returns "??" for null', () => {
    expect(getInitials(null)).toBe('??');
  });

  it('returns "??" for undefined', () => {
    expect(getInitials(undefined)).toBe('??');
  });

  it('returns "??" for empty string', () => {
    expect(getInitials('')).toBe('??');
  });

  it('handles extra whitespace between words', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
  });

  it('handles name with many spaces (filters empty parts)', () => {
    // split('  A  B  ') produces ['', '', 'A', '', 'B', '', '']
    // filter(Boolean) removes empty strings, map takes first char
    expect(getInitials('  A  B  ')).toBe('AB');
  });
});
