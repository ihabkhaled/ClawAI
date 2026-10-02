import { constantTimeEqual } from '../constant-time-equal.utility';

describe('constantTimeEqual', () => {
  it('is true for identical secrets', () => {
    expect(constantTimeEqual('a'.repeat(32), 'a'.repeat(32))).toBe(true);
  });

  it('is false for a different secret of the same length', () => {
    expect(constantTimeEqual('a'.repeat(32), 'b'.repeat(32))).toBe(false);
  });

  it('is false (without throwing) for a different length', () => {
    expect(constantTimeEqual('short', 'a'.repeat(32))).toBe(false);
    expect(constantTimeEqual('', 'a'.repeat(32))).toBe(false);
  });
});
