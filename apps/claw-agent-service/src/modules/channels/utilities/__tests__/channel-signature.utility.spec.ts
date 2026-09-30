import {
  deriveChannelSecret,
  isFreshChannelTimestamp,
  isValidChannelSignature,
  signChannelPayload,
} from '../channel-signature.utility';

const KEY = 'a'.repeat(64);

describe('channel signature utility', () => {
  it('derives a stable, per-owner secret', () => {
    expect(deriveChannelSecret(KEY, 'user-1')).toBe(deriveChannelSecret(KEY, 'user-1'));
    expect(deriveChannelSecret(KEY, 'user-1')).not.toBe(deriveChannelSecret(KEY, 'user-2'));
    expect(deriveChannelSecret(KEY, 'user-1')).toMatch(/^[\da-f]{64}$/);
  });

  it('accepts its own signature and refuses a tampered body or wrong secret', () => {
    const secret = deriveChannelSecret(KEY, 'user-1');
    const signature = signChannelPayload(secret, '1700000000', '{"a":1}');

    expect(signature.startsWith('sha256=')).toBe(true);
    expect(isValidChannelSignature(secret, '1700000000', '{"a":1}', signature)).toBe(true);
    expect(isValidChannelSignature(secret, '1700000000', '{"a":2}', signature)).toBe(false);
    expect(isValidChannelSignature(secret, '1700000001', '{"a":1}', signature)).toBe(false);
    expect(
      isValidChannelSignature(
        deriveChannelSecret(KEY, 'user-2'),
        '1700000000',
        '{"a":1}',
        signature,
      ),
    ).toBe(false);
    expect(isValidChannelSignature(secret, '1700000000', '{"a":1}', 'sha256=short')).toBe(false);
  });

  it('accepts only integer timestamps inside the skew window', () => {
    const now = 1_700_000_000_000;
    expect(isFreshChannelTimestamp('1700000000', now)).toBe(true);
    expect(isFreshChannelTimestamp('1700000299', now)).toBe(true);
    expect(isFreshChannelTimestamp('1699999000', now)).toBe(false);
    expect(isFreshChannelTimestamp('17e8', now)).toBe(false);
    expect(isFreshChannelTimestamp('', now)).toBe(false);
  });
});
