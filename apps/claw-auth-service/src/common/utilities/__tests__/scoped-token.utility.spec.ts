import { USER_JWT_AUDIENCE, USER_JWT_ISSUER } from '@claw/shared-constants';
import { UserRole } from '@claw/shared-types';

import { signAccessToken, verifyAccessToken } from '../jwt.utility';
import { deriveScopedKey, signScopedToken, verifyScopedToken } from '../scoped-token.utility';

const MASTER = 'test-master-secret-that-is-long-enough-for-hs256';
const OPTIONS = { audience: 'claw-grafana', issuer: USER_JWT_ISSUER };

describe('scoped tokens', () => {
  it('derives a stable key per context, different from the master and from other contexts', () => {
    const first = deriveScopedKey(MASTER, 'ctx:a');
    expect(deriveScopedKey(MASTER, 'ctx:a')).toBe(first);
    expect(deriveScopedKey(MASTER, 'ctx:b')).not.toBe(first);
    expect(first).not.toBe(MASTER);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('round-trips claims under the derived key', () => {
    const key = deriveScopedKey(MASTER, 'ctx:a');
    const token = signScopedToken({ sub: 'u1', sid: 's1' }, key, {
      ...OPTIONS,
      expiresInSeconds: 60,
    });
    expect(verifyScopedToken(token, key, OPTIONS)).toMatchObject({
      sub: 'u1',
      sid: 's1',
      aud: 'claw-grafana',
    });
  });

  it('refuses a token signed under another context', () => {
    const token = signScopedToken({ sub: 'u1' }, deriveScopedKey(MASTER, 'ctx:a'), {
      ...OPTIONS,
      expiresInSeconds: 60,
    });
    expect(() => verifyScopedToken(token, deriveScopedKey(MASTER, 'ctx:b'), OPTIONS)).toThrow();
  });

  it('refuses a token for another audience', () => {
    const key = deriveScopedKey(MASTER, 'ctx:a');
    const token = signScopedToken({ sub: 'u1' }, key, { ...OPTIONS, expiresInSeconds: 60 });
    expect(() =>
      verifyScopedToken(token, key, { ...OPTIONS, audience: USER_JWT_AUDIENCE }),
    ).toThrow();
  });

  it('refuses an expired token', () => {
    const key = deriveScopedKey(MASTER, 'ctx:a');
    const token = signScopedToken({ sub: 'u1' }, key, { ...OPTIONS, expiresInSeconds: -10 });
    expect(() => verifyScopedToken(token, key, OPTIONS)).toThrow();
  });

  // The two token kinds must never stand in for each other, in either direction.
  it('a user access token is not a scoped token, and a scoped token is not an access token', () => {
    const key = deriveScopedKey(MASTER, 'ctx:a');
    const access = signAccessToken(
      { sub: 'u1', email: 'a@b.co', role: UserRole.ADMIN, tokenKind: 'user', sessionId: 's1' },
      MASTER,
      '15m',
    );
    expect(() => verifyScopedToken(access, key, OPTIONS)).toThrow();

    const scoped = signScopedToken({ sub: 'u1', email: 'a@b.co', sid: 's1' }, key, {
      ...OPTIONS,
      expiresInSeconds: 60,
    });
    expect(() => verifyAccessToken(scoped, MASTER)).toThrow();
    expect(() => verifyAccessToken(scoped, key)).toThrow();
  });
});
