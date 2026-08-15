import { describe, it, expect } from 'vitest';

import { formatApiFieldErrors } from '../api-error-fields.utility';

describe('formatApiFieldErrors', () => {
  it('formats an array of field/message objects', () => {
    expect(formatApiFieldErrors([{ field: 'email', message: 'Invalid email address' }])).toBe(
      'email: Invalid email address',
    );
  });

  it('omits the leading colon for an empty field', () => {
    expect(formatApiFieldErrors([{ field: '', message: 'Something went wrong' }])).toBe(
      'Something went wrong',
    );
  });

  it('groups messages for the same field', () => {
    expect(
      formatApiFieldErrors([
        { field: 'email', message: 'Invalid email address' },
        { field: 'email', message: 'Email is required' },
      ]),
    ).toBe('email: Invalid email address, Email is required');
  });

  it('joins bare strings with a comma', () => {
    expect(formatApiFieldErrors(['First error', 'Second error'])).toBe('First error, Second error');
  });

  it('formats a record of arrays', () => {
    expect(formatApiFieldErrors({ email: ['must be valid'] })).toBe('email: must be valid');
  });

  it('formats a record of bare strings', () => {
    expect(formatApiFieldErrors({ email: 'must be valid' })).toBe('email: must be valid');
  });

  it.each([undefined, null, 'bare string', 42, [], {}])('returns empty string for %p', (value) => {
    expect(formatApiFieldErrors(value)).toBe('');
  });
});
