import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import { verifyUserAccessToken } from '@claw/shared-utilities';
import { DeviceTokenClass } from '@claw/shared-types';
import { TEST_JWT_SECRET, useAgentTestConfig } from '../../testing/agent-test-env';
import { deriveMobileAccessKey, signAccessToken, verifyAccessToken } from '../jwt.utility';

const claims = (tokenClass: DeviceTokenClass) => ({
  sub: 'user-1',
  deviceId: 'device-1',
  scopes: ['runs:read'],
  jti: 'jti-1',
  orgId: null,
  tokenClass,
});

describe('device access tokens (F097 class separation)', () => {
  beforeAll(() => useAgentTestConfig());

  it('round-trips a desktop token as the DEVICE class', () => {
    const { token } = signAccessToken(claims(DeviceTokenClass.DEVICE), TEST_JWT_SECRET, 900);
    expect(verifyAccessToken(token, TEST_JWT_SECRET)?.tokenClass).toBe(DeviceTokenClass.DEVICE);
  });

  it('round-trips a mobile token as the MOBILE class', () => {
    const { token } = signAccessToken(claims(DeviceTokenClass.MOBILE), TEST_JWT_SECRET, 600);
    const verified = verifyAccessToken(token, TEST_JWT_SECRET);
    expect(verified?.tokenClass).toBe(DeviceTokenClass.MOBILE);
    expect(verified?.scopes).toEqual(['runs:read']);
  });

  it('signs a mobile token with a derived key, not JWT_SECRET', () => {
    const { token } = signAccessToken(claims(DeviceTokenClass.MOBILE), TEST_JWT_SECRET, 600);
    // This is exactly what chat-service, connector-service and the other guards that check
    // only the signature do with a bearer: it must fail for a mobile token.
    expect(() => jwt.verify(token, TEST_JWT_SECRET, { algorithms: ['HS256'] })).toThrow();
    expect(() => verifyUserAccessToken(token, TEST_JWT_SECRET)).toThrow();
    expect(() =>
      jwt.verify(token, deriveMobileAccessKey(TEST_JWT_SECRET), { algorithms: ['HS256'] }),
    ).not.toThrow();
  });

  it('refuses a token signed with JWT_SECRET that calls itself mobile', () => {
    const forged = jwt.sign(
      { sub: 'user-1', deviceId: 'd', scopes: ['runs:read'], cls: 'mobile' },
      TEST_JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: 600,
        jwtid: 'j',
        issuer: 'claw-agent-service',
        audience: 'claw-agent-mobile',
      },
    );
    expect(verifyAccessToken(forged, TEST_JWT_SECRET)).toBeNull();
    const forgedDesktopAudience = jwt.sign(
      { sub: 'user-1', deviceId: 'd', scopes: ['runs:read'], cls: 'mobile' },
      TEST_JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: 600,
        jwtid: 'j',
        issuer: 'claw-agent-service',
        audience: 'claw-agent',
      },
    );
    expect(verifyAccessToken(forgedDesktopAudience, TEST_JWT_SECRET)).toBeNull();
  });

  it('refuses a mobile-key token that drops its class claim', () => {
    const noClass = jwt.sign(
      { sub: 'user-1', deviceId: 'd', scopes: ['shell:exec'] },
      deriveMobileAccessKey(TEST_JWT_SECRET),
      {
        algorithm: 'HS256',
        expiresIn: 600,
        jwtid: 'j',
        issuer: 'claw-agent-service',
        audience: 'claw-agent-mobile',
      },
    );
    expect(verifyAccessToken(noClass, TEST_JWT_SECRET)).toBeNull();
  });

  it('refuses an expired mobile token and a different secret', () => {
    const { token } = signAccessToken(claims(DeviceTokenClass.MOBILE), TEST_JWT_SECRET, -10);
    expect(verifyAccessToken(token, TEST_JWT_SECRET)).toBeNull();
    const live = signAccessToken(claims(DeviceTokenClass.MOBILE), TEST_JWT_SECRET, 600).token;
    expect(verifyAccessToken(live, 'another-secret-another-secret-123456789')).toBeNull();
  });

  it('does not accept a user access token', () => {
    const userToken = jwt.sign(
      { sub: 'user-1', email: 'a@b.c', role: 'USER', tokenKind: 'user', sessionId: 's' },
      TEST_JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: 600,
        issuer: 'claw-auth-service',
        audience: 'claw-user-api',
      },
    );
    expect(verifyAccessToken(userToken, TEST_JWT_SECRET)).toBeNull();
  });
});
