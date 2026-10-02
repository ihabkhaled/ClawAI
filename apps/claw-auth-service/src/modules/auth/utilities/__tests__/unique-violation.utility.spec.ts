import { describe, expect, it } from 'vitest';

import { isUniqueViolationOn } from '../unique-violation.utility';

describe('isUniqueViolationOn', () => {
  it.each([
    [{ code: 'P2002', meta: { target: ['email'] } }, true],
    [{ code: 'P2002', meta: { target: 'users_email_key' } }, true],
    [{ code: 'P2002', meta: { target: ['username'] } }, false],
    // An unreadable target is not claimed: "address taken" must be proven.
    [{ code: 'P2002' }, false],
    [{ code: 'P2025', meta: { target: ['email'] } }, false],
    [new Error('boom'), false],
    [null, false],
    ['P2002', false],
  ])('%j on email -> %s', (error, expected) => {
    expect(isUniqueViolationOn(error, 'email')).toBe(expected);
  });
});
