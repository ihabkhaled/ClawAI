import { UsersService } from '../services/users.service';
import { type UsersRepository } from '../repositories/users.repository';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { DuplicateEntityException, EntityNotFoundException } from '../../../common/errors';
import { UserRole, UserStatus } from '../../../common/enums';
import { validatePasswordStrength } from '../service.utilities/password-policy.utility';
import { verifyPassword } from '@common/utilities';
import { updateUserSchema } from '../dto/update-user.dto';
import { type AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import { type RolesService } from '../../roles/services/roles.service';
import { type PlansRepository } from '../../plans/repositories/plans.repository';

jest.mock('@common/utilities', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  verifyPassword: jest.fn(),
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed',
  role: UserRole.VIEWER,
  status: UserStatus.ACTIVE,
  isSuperAdmin: false,
  emailVerifiedAt: new Date(),
  firstName: null,
  lastName: null,
  phone: null,
  mustChangePassword: false,
  roleId: null,
  activePlanId: null,
  languagePreference: 'EN' as const,
  appearancePreference: 'SYSTEM' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = (): Record<keyof UsersRepository, jest.Mock> => ({
  create: jest.fn(),
  activateAndVerify: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findAll: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  countAll: jest.fn(),
  updatePreferences: jest.fn(),
  revokeSessionsByUserId: jest.fn(),
  revokeOtherSessionsByUserId: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(void 0),
});

const SUPER_ADMIN_ID = 'super-1';
const superAdminRow = { ...mockUser, id: SUPER_ADMIN_ID, isSuperAdmin: true, role: UserRole.ADMIN };
const adminRow = { ...mockUser, id: 'admin-2', role: UserRole.ADMIN };

/** Resolves the actor lookup assertSuperAdminActor performs against the repository. */
const actorIsSuperAdmin = (
  repository: ReturnType<typeof mockRepository>,
  target: unknown,
): void => {
  repository.findById.mockImplementation((id: string) =>
    Promise.resolve(id === SUPER_ADMIN_ID ? superAdminRow : target),
  );
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: ReturnType<typeof mockRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;
  let authEmailAdapter: { sendTemporaryPassword: jest.Mock };
  let rolesService: { getRoleIdBySlug: jest.Mock };
  let plansRepository: {
    findDefault: jest.Mock;
    assignDefaultPlan: jest.Mock;
    assignTrialPlanOnce: jest.Mock;
  };

  beforeEach(() => {
    repository = mockRepository();
    rabbitMQ = mockRabbitMQ();
    authEmailAdapter = { sendTemporaryPassword: jest.fn() };
    rolesService = { getRoleIdBySlug: jest.fn().mockResolvedValue('role-1') };
    plansRepository = {
      findDefault: jest.fn().mockResolvedValue(null),
      assignDefaultPlan: jest.fn(),
      assignTrialPlanOnce: jest.fn(),
    };
    service = new UsersService(
      repository as unknown as UsersRepository,
      rabbitMQ as unknown as RabbitMQService,
      authEmailAdapter as unknown as AuthEmailAdapter,
      rolesService as unknown as RolesService,
      plansRepository as unknown as PlansRepository,
    );
  });

  describe('updateUser', () => {
    it('should update user username successfully', async () => {
      const updatedUser = { ...mockUser, username: 'renamed' };
      repository.findById.mockResolvedValue(mockUser);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(updatedUser);

      const result = await service.updateUser('user-1', { username: 'renamed' }, 'admin-1');

      expect(result.username).toBe('renamed');
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        username: 'renamed',
        role: undefined,
        status: undefined,
      });
    });

    it('should throw EntityNotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('nonexistent', { username: 'renamed' }, 'admin-1'),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw DuplicateEntityException if username already taken', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.findByUsername.mockResolvedValue({ ...mockUser, id: 'other-user' });

      await expect(service.updateUser('user-1', { username: 'taken' }, 'admin-1')).rejects.toThrow(
        DuplicateEntityException,
      );
    });

    it('should ignore an email property and never pass it to updateById', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(mockUser);

      await service.updateUser(
        'user-1',
        updateUserSchema.parse({ email: 'taken@example.com' }),
        'admin-1',
      );

      expect(repository.findByEmail).not.toHaveBeenCalled();
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        username: undefined,
        role: undefined,
        status: undefined,
      });
    });
  });

  describe('updateOwnProfile', () => {
    it('verifies the current password, updates only profile fields, and revokes the other sessions', async () => {
      const updatedUser = { ...mockUser, username: 'renamed' };
      repository.findById.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(true);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(updatedUser);

      const result = await service.updateOwnProfile(
        'user-1',
        {
          currentPassword: 'CurrentPass1!',
          username: 'renamed',
        },
        'session-1',
      );

      expect(result.username).toBe('renamed');
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        username: 'renamed',
      });
      expect(repository.revokeOtherSessionsByUserId).toHaveBeenCalledWith('user-1', 'session-1');
      // The tab doing the rename stays signed in; a rename is not a credential change.
      expect(repository.revokeSessionsByUserId).not.toHaveBeenCalled();
    });
    it('saves personal details without signing the user out everywhere', async () => {
      repository.findById.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(true);
      repository.updateById.mockResolvedValue({
        ...mockUser,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '+14155550123',
      });

      await service.updateOwnProfile(
        'user-1',
        {
          currentPassword: 'CurrentPass1!',
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '+14155550123',
        },
        'session-1',
      );

      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        username: undefined,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '+14155550123',
      });
      expect(repository.revokeOtherSessionsByUserId).not.toHaveBeenCalled();
    });

    it('keeps sessions when the submitted username is unchanged', async () => {
      repository.findById.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(true);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(mockUser);

      await service.updateOwnProfile(
        'user-1',
        {
          currentPassword: 'CurrentPass1!',
          username: mockUser.username,
        },
        'session-1',
      );

      expect(repository.revokeOtherSessionsByUserId).not.toHaveBeenCalled();
    });

    it('rejects an incorrect current password without changing the profile', async () => {
      repository.findById.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(false);

      await expect(
        service.updateOwnProfile(
          'user-1',
          {
            currentPassword: 'WrongPass1!',
            username: 'renamed',
          },
          'session-1',
        ),
      ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteOwnAccount', () => {
    it('verifies the current password, revokes sessions, and deletes the user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(true);
      repository.deleteById.mockResolvedValue(mockUser);

      await service.deleteOwnAccount('user-1', { currentPassword: 'CurrentPass1!' });

      expect(repository.revokeSessionsByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.deleteById).toHaveBeenCalledWith('user-1');
    });

    it('rejects an incorrect password without deleting the user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(false);

      await expect(
        service.deleteOwnAccount('user-1', { currentPassword: 'WrongPass1!' }),
      ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
      expect(repository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('deactivateUser', () => {
    it('rejects every attempt to deactivate the immutable super admin', async () => {
      repository.findById.mockResolvedValue({ ...mockUser, isSuperAdmin: true });

      await expect(service.deactivateUser('super-admin', 'admin-1')).rejects.toMatchObject({
        code: 'SUPER_ADMIN_IMMUTABLE',
      });
      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.revokeSessionsByUserId).not.toHaveBeenCalled();
    });

    it('should deactivate user and publish event', async () => {
      const deactivated = { ...mockUser, status: UserStatus.SUSPENDED };
      repository.findById.mockResolvedValue(mockUser);
      repository.updateById.mockResolvedValue(deactivated);

      const result = await service.deactivateUser('user-1', 'admin-1');

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        status: UserStatus.SUSPENDED,
      });
      expect(repository.revokeSessionsByUserId).toHaveBeenCalledWith('user-1');
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.USER_DEACTIVATED,
        expect.objectContaining({
          userId: 'user-1',
          deactivatedBy: 'admin-1',
        }),
      );
    });

    it('should throw EntityNotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deactivateUser('nonexistent', 'admin-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      const reactivated = { ...mockUser, status: UserStatus.ACTIVE };
      repository.findById.mockResolvedValue(suspendedUser);
      repository.updateById.mockResolvedValue(reactivated);

      const result = await service.reactivateUser('user-1', 'admin-1');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        status: UserStatus.ACTIVE,
      });
    });

    it('should throw EntityNotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.reactivateUser('nonexistent', 'admin-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('changeRole', () => {
    it('rejects every attempt to demote the immutable super admin', async () => {
      repository.findById.mockResolvedValue({ ...mockUser, isSuperAdmin: true });

      await expect(
        service.changeRole('super-admin', UserRole.USER, 'admin-1'),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_IMMUTABLE' });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('should change role and publish event', async () => {
      const updated = { ...mockUser, role: UserRole.OPERATOR };
      repository.findById.mockResolvedValue(mockUser);
      repository.updateById.mockResolvedValue(updated);

      const result = await service.changeRole('user-1', UserRole.OPERATOR, 'admin-1');

      expect(result.role).toBe(UserRole.OPERATOR);
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.USER_ROLE_CHANGED,
        expect.objectContaining({
          userId: 'user-1',
          previousRole: UserRole.VIEWER,
          newRole: UserRole.OPERATOR,
          changedBy: 'admin-1',
        }),
      );
    });

    it('should throw EntityNotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.changeRole('nonexistent', UserRole.ADMIN, 'admin-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('create', () => {
    it('rejects weak password with WEAK_PASSWORD code', async () => {
      await expect(
        service.create(
          {
            email: 'a@b.c',
            username: 'a',
            password: 'weak',
            role: UserRole.OPERATOR,
          } as never,
          'admin-1',
        ),
      ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
    });

    it('rejects duplicate email with DuplicateEntityException', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.create(
          {
            email: mockUser.email,
            username: 'newname',
            password: 'StrongPass1',
            role: UserRole.OPERATOR,
          } as never,
          'admin-1',
        ),
      ).rejects.toThrow(DuplicateEntityException);
    });

    it('rejects duplicate username with DuplicateEntityException', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(mockUser);
      await expect(
        service.create(
          {
            email: 'new@b.c',
            username: mockUser.username,
            password: 'StrongPass1',
            role: UserRole.OPERATOR,
          } as never,
          'admin-1',
        ),
      ).rejects.toThrow(DuplicateEntityException);
    });

    it('creates user, persists hash, and publishes USER_CREATED', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockUser,
        id: 'new-1',
        email: 'new@b.c',
        username: 'newuser',
        role: UserRole.OPERATOR,
      });

      const result = await service.create(
        {
          email: 'new@b.c',
          username: 'newuser',
          password: 'StrongPass1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '+441234567890',
          role: UserRole.OPERATOR,
        } as never,
        'admin-1',
      );

      expect(result.id).toBe('new-1');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@b.c',
          username: 'newuser',
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '+441234567890',
          role: UserRole.OPERATOR,
          status: 'ACTIVE',
          mustChangePassword: true,
        }),
      );
      const calledArgs = repository.create.mock.calls[0]?.[0];
      expect(calledArgs.passwordHash).not.toBe('StrongPass1'); // must be hashed
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.USER_CREATED,
        expect.objectContaining({ userId: 'new-1', email: 'new@b.c' }),
      );
    });
  });

  describe('issueTemporaryPassword', () => {
    it('does not update the password or revoke sessions when email delivery fails', async () => {
      const emailError = new Error('Email delivery failed');
      repository.findById.mockResolvedValue(mockUser);
      authEmailAdapter.sendTemporaryPassword.mockRejectedValue(emailError);

      await expect(service.issueTemporaryPassword(mockUser.id, 'actor-1')).rejects.toBe(emailError);

      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.revokeSessionsByUserId).not.toHaveBeenCalled();
      expect(rabbitMQ.publish).not.toHaveBeenCalled();
    });

    it('sends email, updates the password, and revokes sessions in order', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updateById.mockResolvedValue(undefined);
      repository.revokeSessionsByUserId.mockResolvedValue(undefined);

      await service.issueTemporaryPassword(mockUser.id, 'actor-2');

      expect(authEmailAdapter.sendTemporaryPassword).toHaveBeenCalledTimes(1);
      expect(repository.updateById).toHaveBeenCalledTimes(1);
      expect(repository.revokeSessionsByUserId).toHaveBeenCalledTimes(1);

      expect(authEmailAdapter.sendTemporaryPassword.mock.invocationCallOrder[0]).toBeLessThan(
        repository.updateById.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
      );
      expect(repository.updateById.mock.invocationCallOrder[0]).toBeLessThan(
        repository.revokeSessionsByUserId.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
      );
      expect(rabbitMQ.publish).toHaveBeenCalledTimes(1);
      expect(repository.revokeSessionsByUserId.mock.invocationCallOrder[0]).toBeLessThan(
        rabbitMQ.publish?.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.USER_TEMPORARY_PASSWORD_ISSUED,
        expect.objectContaining({
          userId: mockUser.id,
          issuedBy: 'actor-2',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns SafeUser when found', async () => {
      repository.findById.mockResolvedValue(mockUser);
      const result = await service.findById('user-1');
      expect(result.id).toBe('user-1');
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('throws EntityNotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('nope')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('findAll', () => {
    it('paginates results and computes totalPages', async () => {
      repository.findAll.mockResolvedValue({ users: [mockUser], total: 25 });
      const result = await service.findAll({
        page: 2,
        limit: 10,
        search: 'foo',
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(3);
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('assertSuperAdminActor', () => {
    it('accepts only the immutable seeded super administrator', async () => {
      repository.findById.mockResolvedValue({ ...mockUser, isSuperAdmin: true });

      await expect(service.assertSuperAdminActor('super-admin')).resolves.toBeUndefined();
    });

    it('rejects an ordinary administrator', async () => {
      repository.findById.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });

      await expect(service.assertSuperAdminActor('admin-1')).rejects.toMatchObject({
        code: 'SUPER_ADMIN_REQUIRED',
      });
    });
  });

  describe('updatePreferences', () => {
    it('throws when user not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.updatePreferences('nope', { languagePreference: 'EN' as never }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('returns SafeUser on success', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updatePreferences.mockResolvedValue({
        ...mockUser,
        languagePreference: 'FR' as const,
      });
      const result = await service.updatePreferences('user-1', {
        languagePreference: 'FR' as never,
      });
      expect(result.languagePreference).toBe('FR');
    });
  });

  describe('changePassword', () => {
    it('throws when user not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.changePassword('nope', { currentPassword: 'x', newPassword: 'StrongPass1' }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('throws when current password is wrong', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$invalid$invalid',
      });
      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'StrongPass1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('activatePendingUser', () => {
    const pendingUser = { ...mockUser, status: UserStatus.PENDING, emailVerifiedAt: null };

    it('sets ACTIVE and the verification timestamp in one transaction, and burns the token', async () => {
      repository.findById.mockResolvedValue(pendingUser);
      repository.activateAndVerify.mockResolvedValue({
        ...pendingUser,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });

      const result = await service.activatePendingUser('user-1', 'admin-1');

      expect(repository.activateAndVerify).toHaveBeenCalledWith('user-1', expect.any(Date));
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result.emailVerifiedAt).not.toBeNull();
    });

    it('publishes USER_ACTIVATED, not USER_CREATED', async () => {
      repository.findById.mockResolvedValue(pendingUser);
      repository.activateAndVerify.mockResolvedValue({ ...pendingUser, status: UserStatus.ACTIVE });

      await service.activatePendingUser('user-1', 'admin-1');

      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.USER_ACTIVATED,
        expect.objectContaining({
          userId: 'user-1',
          activatedBy: 'admin-1',
          previousStatus: UserStatus.PENDING,
        }),
      );
    });

    it('refuses an account that is not pending, and writes nothing', async () => {
      // Activating is not reactivating: a SUSPENDED account has already verified
      // its address and needs the suspension lifted instead.
      repository.findById.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });

      await expect(service.activatePendingUser('user-1', 'admin-1')).rejects.toMatchObject({
        code: 'USER_NOT_PENDING',
      });
      expect(repository.activateAndVerify).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown target', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.activatePendingUser('nope', 'admin-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('refuses a non-super administrator activating a pending ADMIN', async () => {
      repository.findById.mockResolvedValue({
        ...pendingUser,
        role: UserRole.ADMIN,
        id: 'admin-3',
      });

      await expect(service.activatePendingUser('admin-3', 'admin-2')).rejects.toMatchObject({
        code: 'SUPER_ADMIN_REQUIRED',
      });
      expect(repository.activateAndVerify).not.toHaveBeenCalled();
    });
  });

  describe('super-administrator authority', () => {
    it('refuses a non-super administrator promoting themselves through PATCH /users/:id', async () => {
      // The hole that made every other protection decorative: changeRole was
      // gated, updateUser accepted the same field and was not.
      repository.findById.mockImplementation((id: string) =>
        Promise.resolve(id === 'admin-2' ? adminRow : mockUser),
      );

      await expect(
        service.updateUser('admin-2', { role: UserRole.ADMIN }, 'admin-2'),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('lets the super administrator promote someone through PATCH /users/:id', async () => {
      actorIsSuperAdmin(repository, mockUser);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateById.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });

      await service.updateUser('user-1', { role: UserRole.ADMIN }, SUPER_ADMIN_ID);

      expect(repository.updateById).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ role: UserRole.ADMIN }),
      );
    });

    it('refuses a non-super administrator creating another administrator', async () => {
      repository.findById.mockResolvedValue(adminRow);

      await expect(
        service.create(
          {
            email: 'peer@b.c',
            username: 'peer',
            password: 'StrongPass1!',
            role: UserRole.ADMIN,
          } as never,
          'admin-2',
        ),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a non-super administrator deactivating another administrator', async () => {
      repository.findById.mockImplementation((id: string) =>
        Promise.resolve(id === 'admin-2' ? adminRow : adminRow),
      );

      await expect(service.deactivateUser('admin-3', 'admin-2')).rejects.toMatchObject({
        code: 'SUPER_ADMIN_REQUIRED',
      });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('still lets an ordinary administrator deactivate an ordinary user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.updateById.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });

      await service.deactivateUser('user-1', 'admin-2');

      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        status: UserStatus.SUSPENDED,
      });
    });

    it('refuses another administrator editing the super administrator', async () => {
      repository.findById.mockResolvedValue(superAdminRow);

      await expect(
        service.updateUser(SUPER_ADMIN_ID, { firstName: 'Nope' }, 'admin-2'),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_IMMUTABLE' });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('lets the super administrator edit their own profile', async () => {
      repository.findById.mockResolvedValue(superAdminRow);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateById.mockResolvedValue({ ...superAdminRow, firstName: 'Ada' });

      const result = await service.updateUser(SUPER_ADMIN_ID, { firstName: 'Ada' }, SUPER_ADMIN_ID);

      expect(result.firstName).toBe('Ada');
    });

    it('refuses the super administrator changing their own status, and writes nothing', async () => {
      repository.findById.mockResolvedValue(superAdminRow);

      await expect(
        service.updateUser(SUPER_ADMIN_ID, { status: UserStatus.SUSPENDED }, SUPER_ADMIN_ID),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_SELF_LOCKED' });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses the super administrator deleting their own account', async () => {
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      repository.findById.mockResolvedValue(superAdminRow);

      await expect(
        service.deleteOwnAccount(SUPER_ADMIN_ID, { currentPassword: 'x' } as never),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_SELF_LOCKED' });
      expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it('returns 404 rather than 403 for an unknown target — absence is not a refusal', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateUser('nope', { firstName: 'x' }, 'admin-2')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });
});

describe('Password Policy', () => {
  it('should accept a valid password', () => {
    const result = validatePasswordStrength('StrongPass1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should reject password longer than 128 characters', () => {
    const longPass = `Aa1${'a'.repeat(126)}`;
    const result = validatePasswordStrength(longPass);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at most 128 characters');
  });

  it('should reject password without uppercase letter', () => {
    const result = validatePasswordStrength('lowercase1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain an uppercase letter');
  });

  it('should reject password without lowercase letter', () => {
    const result = validatePasswordStrength('UPPERCASE1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain a lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePasswordStrength('NoNumberHere');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain a number');
  });

  it('should return multiple errors for very weak password', () => {
    const result = validatePasswordStrength('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
