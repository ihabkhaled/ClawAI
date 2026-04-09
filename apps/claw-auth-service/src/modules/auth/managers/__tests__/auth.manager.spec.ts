import { AuthManager } from '../auth.manager';
import { type AuthRepository } from '../../repositories/auth.repository';
import { UserRole, UserStatus } from '../../../../common/enums';
import {
  AccountSuspendedException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../../../../common/errors';
import * as utilities from '@common/utilities';

// Mock the utilities module (the @common/utilities alias)
jest.mock('@common/utilities', () => ({
  verifyPassword: jest.fn(),
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
}));

// Mock AppConfig
jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    }),
  },
}));

const mockedUtilities = jest.mocked(utilities);

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  role: UserRole.VIEWER,
  status: UserStatus.ACTIVE,
  mustChangePassword: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockRepository = (): Record<keyof AuthRepository, jest.Mock> => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
  findSessionByRefreshToken: jest.fn(),
  deleteSession: jest.fn().mockResolvedValue(void 0),
  deleteSessionsByUserId: jest.fn().mockResolvedValue(void 0),
  deleteExpiredSessions: jest.fn().mockResolvedValue(0),
});

describe('AuthManager', () => {
  let manager: AuthManager;
  let repository: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repository = mockRepository();
    manager = new AuthManager(repository as unknown as AuthRepository);
    jest.clearAllMocks();
    // Re-set defaults after clearAllMocks
    repository.createSession.mockResolvedValue({ id: 'session-1' });
    repository.deleteSession.mockResolvedValue(void 0);
    repository.deleteSessionsByUserId.mockResolvedValue(void 0);
  });

  describe('login', () => {
    it('should return tokens and user profile for valid credentials', async () => {
      repository.findUserByEmail.mockResolvedValue(mockUser);
      mockedUtilities.verifyPassword.mockResolvedValue(true);

      // Re-set defaults after clearAllMocks
      mockedUtilities.signAccessToken.mockReturnValue('mock-access-token');
      mockedUtilities.signRefreshToken.mockReturnValue('mock-refresh-token');

      const result = await manager.login('test@example.com', 'correct-password');

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe(UserRole.VIEWER);
      expect(repository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedUtilities.verifyPassword).toHaveBeenCalledWith(
        'hashed-password',
        'correct-password',
      );
    });

    it('should throw InvalidCredentialsException when user is not found', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(manager.login('unknown@example.com', 'password')).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      repository.findUserByEmail.mockResolvedValue(mockUser);
      mockedUtilities.verifyPassword.mockResolvedValue(false);

      await expect(manager.login('test@example.com', 'wrong-password')).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw AccountSuspendedException for a suspended account', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      repository.findUserByEmail.mockResolvedValue(suspendedUser);

      await expect(manager.login('test@example.com', 'any-password')).rejects.toThrow(
        AccountSuspendedException,
      );
    });

    it('should throw InvalidCredentialsException for a pending account', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      repository.findUserByEmail.mockResolvedValue(pendingUser);

      await expect(manager.login('test@example.com', 'any-password')).rejects.toThrow(
        InvalidCredentialsException,
      );
    });
  });

  describe('refresh', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    it('should return new tokens for a valid refresh token', async () => {
      repository.findSessionByRefreshToken.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'valid-refresh-token',
        expiresAt: futureDate,
      });
      repository.findUserById.mockResolvedValue(mockUser);

      mockedUtilities.signAccessToken.mockReturnValue('new-access-token');
      mockedUtilities.signRefreshToken.mockReturnValue('new-refresh-token');

      const result = await manager.refresh('valid-refresh-token');

      expect(result.tokens.accessToken).toBe('new-access-token');
      expect(result.tokens.refreshToken).toBe('new-refresh-token');
      expect(repository.deleteSession).toHaveBeenCalledWith('session-1');
      expect(repository.createSession).toHaveBeenCalled();
    });

    it('should throw InvalidRefreshTokenException when session is not found', async () => {
      repository.findSessionByRefreshToken.mockResolvedValue(null);

      await expect(manager.refresh('nonexistent-token')).rejects.toThrow(
        InvalidRefreshTokenException,
      );
    });

    it('should throw InvalidRefreshTokenException for an expired session', async () => {
      const pastDate = new Date(Date.now() - 1000);
      repository.findSessionByRefreshToken.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'expired-token',
        expiresAt: pastDate,
      });

      await expect(manager.refresh('expired-token')).rejects.toThrow(InvalidRefreshTokenException);
      expect(repository.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should throw InvalidRefreshTokenException when user is no longer active', async () => {
      repository.findSessionByRefreshToken.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'valid-token',
        expiresAt: futureDate,
      });
      repository.findUserById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(manager.refresh('valid-token')).rejects.toThrow(InvalidRefreshTokenException);
      expect(repository.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should throw InvalidRefreshTokenException when user is not found', async () => {
      repository.findSessionByRefreshToken.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'valid-token',
        expiresAt: futureDate,
      });
      repository.findUserById.mockResolvedValue(null);

      await expect(manager.refresh('valid-token')).rejects.toThrow(InvalidRefreshTokenException);
    });
  });

  describe('logout', () => {
    it('should delete all sessions for the user', async () => {
      await manager.logout('user-1');

      expect(repository.deleteSessionsByUserId).toHaveBeenCalledWith('user-1');
    });
  });
});
