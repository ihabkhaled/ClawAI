import { constantTimeTokenHashEquals, hashBearerToken } from '../token-security.utility';

const FIRST_PEPPER = 'first-test-pepper-at-least-thirty-two-characters';
const SECOND_PEPPER = 'second-test-pepper-at-least-thirty-two-characters';

describe('token security', () => {
  it('creates a deterministic digest without returning the bearer token', () => {
    const digest = hashBearerToken('raw-refresh-token', FIRST_PEPPER);

    expect(digest).toBe(hashBearerToken('raw-refresh-token', FIRST_PEPPER));
    expect(digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(digest).not.toContain('raw-refresh-token');
  });

  it('changes the digest when the bearer token or pepper changes', () => {
    const digest = hashBearerToken('raw-refresh-token', FIRST_PEPPER);

    expect(hashBearerToken('other-refresh-token', FIRST_PEPPER)).not.toBe(digest);
    expect(hashBearerToken('raw-refresh-token', SECOND_PEPPER)).not.toBe(digest);
  });

  it('compares equal digests and rejects unequal or malformed values', () => {
    const digest = hashBearerToken('raw-refresh-token', FIRST_PEPPER);

    expect(constantTimeTokenHashEquals(digest, digest)).toBe(true);
    expect(
      constantTimeTokenHashEquals(digest, hashBearerToken('other-refresh-token', FIRST_PEPPER)),
    ).toBe(false);
    expect(constantTimeTokenHashEquals(digest, 'not-a-sha256-digest')).toBe(false);
  });

  it.each([
    ['', FIRST_PEPPER],
    ['raw-refresh-token', ''],
    ['a'.repeat(16_385), FIRST_PEPPER],
    ['raw-refresh-token', 'a'.repeat(4_097)],
  ])('rejects an empty or oversized token-security input', (token, pepper) => {
    expect(() => hashBearerToken(token, pepper)).toThrow(
      'Token security input is outside the allowed bounds',
    );
  });
});
