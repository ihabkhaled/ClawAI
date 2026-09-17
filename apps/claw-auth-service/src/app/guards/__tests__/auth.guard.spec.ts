import { type Mocked, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { AuthGuard } from '../auth.guard';
import { UserRole } from '../../../common/enums';
import * as utilities from '@common/utilities';

// Mock the @common/utilities module
vi.mock('@common/utilities', () => ({
  verifyAccessToken: vi.fn(),
}));

// Mock AppConfig
vi.mock('../../config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
    }),
  },
}));

const { verifyAccessToken } = vi.mocked(utilities);

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
  let reflector: Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Mocked<Reflector>;

    guard = new AuthGuard(reflector);
    vi.clearAllMocks();
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
        tokenKind: 'user' as const,
        sessionId: 'session-1',
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
        sessionId: 'session-1',
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
