import { vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { type UserAccessTokenPayload, UserRole } from '@claw/shared-types';
import { verifyUserAccessToken } from '@claw/shared-utilities';

import { SessionRevocationGuard } from '../session-revocation.guard';
import { isSessionRevoked } from '../session-revocation';

vi.mock('@claw/shared-utilities', () => ({ verifyUserAccessToken: vi.fn() }));
vi.mock('../session-revocation', () => ({ isSessionRevoked: vi.fn() }));

const mockedVerify = vi.mocked(verifyUserAccessToken);
const mockedRevoked = vi.mocked(isSessionRevoked);

const contextFor = (authorization?: string, isPublic = false) => {
  const request = { headers: authorization === undefined ? {} : { authorization } };
  return {
    context: {
      getClass: vi.fn(),
      getHandler: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({ getRequest: vi.fn().mockReturnValue(request) }),
    } as unknown as Parameters<SessionRevocationGuard['canActivate']>[0],
    reflector: { getAllAndOverride: vi.fn().mockReturnValue(isPublic) } as unknown as Reflector,
  };
};

const verified: UserAccessTokenPayload = {
  sub: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
  tokenKind: 'user',
  sessionId: 'session-1',
};

describe('SessionRevocationGuard', () => {
  const originalSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-long-enough';
    mockedRevoked.mockResolvedValue(false);
    mockedVerify.mockReturnValue(verified);
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env['JWT_SECRET'];
    } else {
      process.env['JWT_SECRET'] = originalSecret;
    }
  });

  // TD-033: this is the whole point — the signature is still valid.
  it('refuses a token whose session was revoked', async () => {
    mockedRevoked.mockResolvedValue(true);
    const { context, reflector } = contextFor('Bearer access-token');

    await expect(new SessionRevocationGuard(reflector).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockedRevoked).toHaveBeenCalledWith('session-1');
  });

  it('lets a live session through', async () => {
    const { context, reflector } = contextFor('Bearer access-token');

    await expect(new SessionRevocationGuard(reflector).canActivate(context)).resolves.toBe(true);
  });

  // Everything it cannot read is the service AuthGuard's decision, not this
  // guard's: it must never turn one of those cases into a refusal.
  it.each([
    ['a public route', 'Bearer access-token', true],
    ['no authorization header', undefined, false],
    ['a non-bearer header', 'Service token', false],
  ])('passes %s through without asking', async (_label, authorization, isPublic) => {
    const { context, reflector } = contextFor(authorization, isPublic);

    await expect(new SessionRevocationGuard(reflector).canActivate(context)).resolves.toBe(true);
    expect(mockedRevoked).not.toHaveBeenCalled();
  });

  it('passes a token of another shape through (an ops token)', async () => {
    mockedVerify.mockImplementation(() => {
      throw new Error('not a user access token');
    });
    const { context, reflector } = contextFor('Bearer ops-token');

    await expect(new SessionRevocationGuard(reflector).canActivate(context)).resolves.toBe(true);
    expect(mockedRevoked).not.toHaveBeenCalled();
  });

  it('passes through when the service has no JWT_SECRET', async () => {
    delete process.env['JWT_SECRET'];
    const { context, reflector } = contextFor('Bearer access-token');

    await expect(new SessionRevocationGuard(reflector).canActivate(context)).resolves.toBe(true);
    expect(mockedRevoked).not.toHaveBeenCalled();
  });
});
