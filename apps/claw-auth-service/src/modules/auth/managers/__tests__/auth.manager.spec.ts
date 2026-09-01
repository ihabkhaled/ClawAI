import { AuthManager } from '../auth.manager';
import { type TokenSessionManager } from '../token-session.manager';
import { type AuthRepository } from '../../repositories/auth.repository';
import { type RolesService } from '../../../roles/services/roles.service';
import { type PlansRepository } from '../../../plans/repositories/plans.repository';
import { UserRole, UserStatus } from '../../../../common/enums';
import { AccountSuspendedException, InvalidCredentialsException } from '../../../../common/errors';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import * as utilities from '@common/utilities';

// Mock the utilities module (the @common/utilities alias)
jest.mock('@common/utilities', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

const mockedUtilities = jest.mocked(utilities);

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  role: UserRole.VIEWER,
  status: UserStatus.ACTIVE,
  firstName: null,
  lastName: null,
  phone: null,
  mustChangePassword: false,
  isSuperAdmin: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockRepository = (): Record<keyof AuthRepository, jest.Mock> => ({
  findUserByEmail: jest.fn(),
  findUserByUsername: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  createSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
  findSessionByRefreshTokenHash: jest.fn(),
  rotateSession: jest.fn(),
  revokeSessionFamily: jest.fn(),
  revokeSessionForUser: jest.fn(),
  deleteSession: jest.fn().mockResolvedValue(void 0),
  deleteSessionsByUserId: jest.fn().mockResolvedValue(void 0),
  deleteExpiredSessions: jest.fn().mockResolvedValue(0),
});

// RolesService is consulted for permission resolution + default role id.
const mockRolesService = (): {
  resolvePermissionsForUser: jest.Mock;
  resolvePermissionsBySlug: jest.Mock;
  getDefaultUserRoleId: jest.Mock;
} => ({
  resolvePermissionsForUser: jest.fn().mockResolvedValue([]),
  resolvePermissionsBySlug: jest.fn().mockResolvedValue([]),
  getDefaultUserRoleId: jest.fn().mockResolvedValue('role-user'),
});

// PlansRepository — registration assigns the default plan.
const mockPlansRepository = (): {
  findDefault: jest.Mock;
  assignDefaultPlan: jest.Mock;
  assignTrialPlanOnce: jest.Mock;
} => ({
  findDefault: jest.fn().mockResolvedValue({ id: 'plan-free', slug: 'free', isTrial: true }),
  assignDefaultPlan: jest.fn(),
  assignTrialPlanOnce: jest.fn().mockResolvedValue({ id: 'assignment-free' }),
});

const tokenPair = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 900,
  refreshExpiresIn: 604_800,
  tokenType: 'Bearer' as const,
};

const mockTokenSessionManager = (): {
  issue: jest.Mock;
  rotate: jest.Mock;
  revokeCurrent: jest.Mock;
} => ({
  issue: jest.fn().mockResolvedValue(tokenPair),
  rotate: jest.fn().mockResolvedValue(tokenPair),
  revokeCurrent: jest.fn().mockResolvedValue(void 0),
});

describe('AuthManager', () => {
  let manager: AuthManager;
  let repository: ReturnType<typeof mockRepository>;
  let rolesService: ReturnType<typeof mockRolesService>;
  let plansRepository: ReturnType<typeof mockPlansRepository>;
  let tokenSessionManager: ReturnType<typeof mockTokenSessionManager>;

  beforeEach(() => {
    repository = mockRepository();
    rolesService = mockRolesService();
    plansRepository = mockPlansRepository();
    tokenSessionManager = mockTokenSessionManager();
    manager = new AuthManager(
      repository as unknown as AuthRepository,
      rolesService as unknown as RolesService,
      plansRepository as unknown as PlansRepository,
      tokenSessionManager as unknown as TokenSessionManager,
    );
    jest.clearAllMocks();
    // Re-set defaults after clearAllMocks
    repository.createSession.mockResolvedValue({ id: 'session-1' });
    repository.deleteSession.mockResolvedValue(void 0);
    repository.deleteSessionsByUserId.mockResolvedValue(void 0);
  });

  describe('register', () => {
    it('creates a pending USER without issuing login tokens', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      repository.findUserByUsername.mockResolvedValue(null);
      repository.createUser.mockResolvedValue({
        ...mockUser,
        id: 'new-user',
        email: 'new@example.com',
        username: 'new',
        role: UserRole.USER,
        roleId: 'role-user',
      });
      rolesService.resolvePermissionsForUser.mockResolvedValue(['CHAT_USE']);

      const result = await manager.register({
        email: 'new@example.com',
        password: 'Str0ng!Pass',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1234567890',
      });

      expect(result.verificationRequired).toBe(true);
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.role).toBe(UserRole.USER);
      expect(result.user.permissions).toEqual(['CHAT_USE']);
      const created = repository.createUser.mock.calls[0]?.[0];
      expect(created).toEqual(
        expect.objectContaining({ firstName: 'Jane', lastName: 'Doe', phone: '+1234567890' }),
      );
      expect(created.role).toBe(UserRole.USER);
      expect(created.status).toBe(UserStatus.PENDING);
      expect(created.roleRef).toEqual({ connect: { id: 'role-user' } });
      expect(tokenSessionManager.issue).not.toHaveBeenCalled();
    });

    it('rejects a duplicate email', async () => {
      repository.findUserByEmail.mockResolvedValue(mockUser);
      await expect(
        manager.register({
          email: 'test@example.com',
          password: 'Str0ng!Pass',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(/already exists/i);
      expect(repository.createUser).not.toHaveBeenCalled();
    });

    it('rejects a weak password before touching the DB', async () => {
      await expect(
        manager.register({
          email: 'new@example.com',
          password: 'weak',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toThrow();
      expect(repository.findUserByEmail).not.toHaveBeenCalled();
    });

    it('de-duplicates the derived username when the base is taken', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      repository.findUserByUsername.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);
      repository.createUser.mockResolvedValue({ ...mockUser, role: UserRole.USER });

      await manager.register({
        email: 'taken@example.com',
        password: 'Str0ng!Pass',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const created = repository.createUser.mock.calls[0]?.[0];
      expect(created.username).toBe('taken1');
    });
  });

  describe('login', () => {
    it('should return tokens and user profile for valid credentials', async () => {
      repository.findUserByEmail.mockResolvedValue(mockUser);
      mockedUtilities.verifyPassword.mockResolvedValue(true);

      const result = await manager.login('test@example.com', 'correct-password');

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe(UserRole.VIEWER);
      expect(result.user.isSuperAdmin).toBe(false);
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

    it('issues tokens for the declared VS Code client', async () => {
      repository.findUserByEmail.mockResolvedValue(mockUser);
      mockedUtilities.verifyPassword.mockResolvedValue(true);
      const client = {
        kind: SessionClientKind.VSCODE,
        name: 'ClawAI for VS Code',
      };

      await manager.login('test@example.com', 'correct-password', client);

      expect(tokenSessionManager.issue).toHaveBeenCalledWith(mockUser, client);
    });
  });

  describe('refresh', () => {
    it('delegates one-time refresh rotation to the token-session manager', async () => {
      const result = await manager.refresh('valid-refresh-token');

      expect(result.tokens).toEqual(tokenPair);
      expect(tokenSessionManager.rotate).toHaveBeenCalledWith('valid-refresh-token');
    });
  });

  describe('logout', () => {
    it('revokes the authenticated current session', async () => {
      await manager.logout('user-1', 'session-1');

      expect(tokenSessionManager.revokeCurrent).toHaveBeenCalledWith('user-1', 'session-1');
    });
  });

  describe('getProfile', () => {
    it('exposes the immutable super-admin marker to authenticated clients', async () => {
      repository.findUserById.mockResolvedValue({ ...mockUser, isSuperAdmin: true });

      await expect(manager.getProfile('user-1')).resolves.toMatchObject({ isSuperAdmin: true });
    });

    it('returns firstName/lastName/phone as null for a user without them', async () => {
      repository.findUserById.mockResolvedValue(mockUser);

      await expect(manager.getProfile('user-1')).resolves.toMatchObject({
        firstName: null,
        lastName: null,
        phone: null,
      });
    });
  });
});
