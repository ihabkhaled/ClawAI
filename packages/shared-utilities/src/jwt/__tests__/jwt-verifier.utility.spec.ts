import jwt from 'jsonwebtoken';

import { UserRole } from '@claw/shared-types';

import { verifyUserAccessToken } from '../jwt-verifier.utility';

const TEST_SECRET = 'test-secret-at-least-thirty-two-characters';

function signUserToken(overrides: Readonly<Record<string, unknown>> = {}): string {
  return jwt.sign(
    {
      sub: 'user-1',
      email: 'developer@example.com',
      role: UserRole.USER,
      tokenKind: 'user',
      sessionId: 'session-1',
      ...overrides,
    },
    TEST_SECRET,
    {
      algorithm: 'HS256',
      audience: 'claw-user-api',
      issuer: 'claw-auth-service',
    },
  );
}

describe('verifyUserAccessToken', () => {
  it('accepts a session-bound user access token', () => {
    const payload = verifyUserAccessToken(signUserToken(), TEST_SECRET);

    expect(payload).toMatchObject({
      sub: 'user-1',
      email: 'developer@example.com',
      role: UserRole.USER,
      tokenKind: 'user',
      sessionId: 'session-1',
    });
  });

  it('rejects a correctly signed claw-agent token', () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        deviceId: 'device-1',
        scopes: ['shell:exec'],
      },
      TEST_SECRET,
      {
        algorithm: 'HS256',
        audience: 'claw-agent',
        issuer: 'claw-agent-service',
      },
    );

    expect(() => verifyUserAccessToken(token, TEST_SECRET)).toThrow(jwt.JsonWebTokenError);
  });

  it.each([
    ['token kind', { tokenKind: 'agent' }],
    ['subject', { sub: '' }],
    ['email', { email: '' }],
    ['role', { role: 'OWNER' }],
    ['session id', { sessionId: '' }],
  ])('rejects an invalid %s claim', (_claim, overrides) => {
    expect(() => verifyUserAccessToken(signUserToken(overrides), TEST_SECRET)).toThrow(
      'Invalid user access token payload',
    );
  });
});
