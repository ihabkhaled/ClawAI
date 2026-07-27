import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { UserRole } from '@claw/shared-types';
import { verifyUserAccessToken } from '@claw/shared-utilities';
import { AuthGuard } from '../auth.guard';

jest.mock('@claw/shared-utilities', () => ({
  verifyUserAccessToken: jest.fn(),
}));

const mockedVerifyUserAccessToken = jest.mocked(verifyUserAccessToken);

function createContext(authorization?: string): {
  context: Parameters<AuthGuard['canActivate']>[0];
  request: {
    headers: { authorization?: string };
    user?: unknown;
  };
} {
  const request = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  };

  return {
    context: context as unknown as Parameters<AuthGuard['canActivate']>[0],
    request,
  };
}

describe('AuthGuard', () => {
  const originalSecret = process.env['JWT_SECRET'];
  let guard: AuthGuard;

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-long-enough';
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    guard = new AuthGuard(reflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalSecret) {
      process.env['JWT_SECRET'] = originalSecret;
    } else {
      delete process.env['JWT_SECRET'];
    }
  });

  it('attaches the verified session-bound principal', () => {
    mockedVerifyUserAccessToken.mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: UserRole.USER,
      tokenKind: 'user',
      sessionId: 'session-1',
    });
    const { context, request } = createContext('Bearer access-token');

    expect(guard.canActivate(context)).toBe(true);
    expect(mockedVerifyUserAccessToken).toHaveBeenCalledWith(
      'access-token',
      'test-secret-key-that-is-long-enough',
    );
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.USER,
      sessionId: 'session-1',
    });
  });

  it('rejects a token that fails strict verification', () => {
    mockedVerifyUserAccessToken.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const { context } = createContext('Bearer invalid-token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
