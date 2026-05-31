import { describe, it, expect } from 'vitest';

import { extractErrorMessage } from '@/utilities/error-state.utility';

describe('extractErrorMessage', () => {
  it('returns undefined for null/undefined', () => {
    expect(extractErrorMessage(null)).toBeUndefined();
    expect(extractErrorMessage(undefined)).toBeUndefined();
  });

  it('returns the string as-is', () => {
    expect(extractErrorMessage('boom')).toBe('boom');
  });

  it('returns the message from an Error', () => {
    expect(extractErrorMessage(new Error('failed'))).toBe('failed');
  });

  it('returns the message from an object with a string message', () => {
    expect(extractErrorMessage({ message: 'api error' })).toBe('api error');
  });

  it('returns undefined when message is not a string', () => {
    expect(extractErrorMessage({ message: 42 })).toBeUndefined();
    expect(extractErrorMessage({ other: 'x' })).toBeUndefined();
  });
});
