import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../auth.guard';
import { UserRole } from '../../../common/enums';
import * as utilities from '@common/utilities';

// Mock the @common/utilities module
jest.mock('@common/utilities', () => ({
  verifyAccessToken: jest.fn(),
}));

// Mock AppConfig
jest.mock('../../config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
    }),
  },
}));

const { verifyAccessToken } = jest.mocked(utilities);

function createMockExecutionContext(headers: Record<string, string | undefined> = {}): {
  context: unknown;
  request: { headers: Record<string, string | undefined>; user?: unknown };
} {
  const request = { headers, user: undefined as unknown };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };

  return { context: context as never, request };
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    guard = new AuthGuard(reflector);
    jest.clearAllMocks();
    // Restore default mock after clearAllMocks
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  describe('public endpoints', () => {
    it('should allow requests to public endpoints without a token', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const { context } = createMockExecutionContext();

      const result = guard.canActivate(context as never);

      expect(result).toBe(true);
    });
  });

  describe('protected endpoints', () => {
    it('should allow requests with a valid token and attach user to request', () => {
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      verifyAccessToken.mockReturnValue(mockPayload);

      const { context, request } = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const result = guard.canActivate(context as never);

      expect(result).toBe(true);
      expect(request.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      });
      expect(verifyAccessToken).toHaveBeenCalledWith(
        'valid-token',
        'test-secret-key-that-is-long-enough',
      );
    });

    it('should throw UnauthorizedException when authorization header is missing', () => {
      const { context } = createMockExecutionContext({});

      expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid header format (no Bearer prefix)', () => {
      const { context } = createMockExecutionContext({
        authorization: 'Basic some-token',
      });

      expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for header with only Bearer keyword', () => {
      const { context } = createMockExecutionContext({
        authorization: 'Bearer',
      });

      expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token verification fails (expired)', () => {
      verifyAccessToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const { context } = createMockExecutionContext({
        authorization: 'Bearer expired-token',
      });

      expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token verification fails (invalid)', () => {
      verifyAccessToken.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const { context } = createMockExecutionContext({
        authorization: 'Bearer tampered-token',
      });

      expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
    });
  });
});
