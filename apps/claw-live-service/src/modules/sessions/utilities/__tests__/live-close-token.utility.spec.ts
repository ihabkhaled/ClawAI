import { signCloseToken, verifyCloseToken } from '../live-close-token.utility';

const SECRET = 'a'.repeat(40);
const NOW = 1_800_000_000_000;

describe('close token', () => {
  const token = signCloseToken(SECRET, { sessionId: 's1', userId: 'u1', expiresAt: NOW + 1000 });

  it('verifies a valid unexpired token', () => {
    expect(verifyCloseToken(SECRET, token, NOW)).toEqual({
      sessionId: 's1',
      userId: 'u1',
      expiresAt: NOW + 1000,
    });
  });

  it('rejects an expired token', () => {
    expect(verifyCloseToken(SECRET, token, NOW + 1000)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    expect(verifyCloseToken('b'.repeat(40), token, NOW)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const [, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ s: 's1', u: 'attacker', e: NOW + 1000 })).toString(
      'base64url',
    );
    expect(verifyCloseToken(SECRET, `${forged}.${mac}`, NOW)).toBeNull();
  });

  it.each(['', 'nodot', 'a.b.c', '.x', 'x.'])('rejects malformed input %j', (value) => {
    expect(verifyCloseToken(SECRET, value, NOW)).toBeNull();
  });
});
