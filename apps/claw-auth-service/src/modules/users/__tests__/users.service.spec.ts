import { UsersService } from '../services/users.service';
import { UsersRepository } from '../repositories/users.repository';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { EntityNotFoundException, DuplicateEntityException } from '../../../common/errors';
import { UserRole, UserStatus } from '../../../common/enums';
import { validatePasswordStrength } from '../service.utilities/password-policy.utility';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed',
  role: UserRole.VIEWER,
  status: UserStatus.ACTIVE,
  mustChangePassword: false,
  languagePreference: 'EN' as const,
  appearancePreference: 'SYSTEM' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = (): Record<keyof UsersRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findAll: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  countAll: jest.fn(),
  updatePreferences: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: ReturnType<typeof mockRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    repository = mockRepository();
    rabbitMQ = mockRabbitMQ();
    service = new UsersService(
      repository as unknown as UsersRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, email: 'new@example.com' };
      repository.findById.mockResolvedValue(mockUser);
      repository.findByEmail.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(updatedUser);

      const result = await service.updateUser('user-1', { email: 'new@example.com' }, 'admin-1');

      expect(result.email).toBe('new@example.com');
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        email: 'new@example.com',
        username: undefined,
        role: undefined,
        status: undefined,
      });
    });

    it('should throw EntityNotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('nonexistent', { email: 'new@example.com' }, 'admin-1'),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw DuplicateEntityException if email already taken', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.findByEmail.mockResolvedValue({ ...mockUser, id: 'other-user' });

      await expect(
        service.updateUser('user-1', { email: 'taken@example.com' }, 'admin-1'),
      ).rejects.toThrow(DuplicateEntityException);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user and publish event', async () => {
      const deactivated = { ...mockUser, status: UserStatus.SUSPENDED };
      repository.findById.mockResolvedValue(mockUser);
      repository.updateById.mockResolvedValue(deactivated);

      const result = await service.deactivateUser('user-1', 'admin-1');

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(repository.updateById).toHaveBeenCalledWith('user-1', {
        status: UserStatus.SUSPENDED,
      });
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
