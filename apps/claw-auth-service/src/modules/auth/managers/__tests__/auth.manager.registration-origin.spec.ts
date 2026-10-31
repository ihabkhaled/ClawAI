import { type Mock } from 'vitest';
import { UserRole, UserStatus } from '../../../../common/enums';
import { type PlansRepository } from '../../../plans/repositories/plans.repository';
import { type RolesService } from '../../../roles/services/roles.service';
import { type AuthRepository } from '../../repositories/auth.repository';
import { AuthManager } from '../auth.manager';
import { type TokenSessionManager } from '../token-session.manager';

vi.mock('@common/utilities', () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue('hashed'),
  burnPasswordVerification: vi.fn().mockResolvedValue(false),
}));

const dto = { email: 'new@example.com', password: 'Str0ng!Pass', firstName: 'J', lastName: 'D' };

describe('AuthManager.register records where the account came from', () => {
  let createUser: Mock;
  let manager: AuthManager;

  beforeEach(() => {
    createUser = vi.fn().mockResolvedValue({
      id: 'u1',
      email: dto.email,
      role: UserRole.USER,
      status: UserStatus.PENDING,
      roleId: null,
    });
    manager = new AuthManager(
      {
        findUserByEmail: vi.fn().mockResolvedValue(null),
        findUserByUsername: vi.fn().mockResolvedValue(null),
        createUser,
      } as unknown as AuthRepository,
      {
        getDefaultUserRoleId: vi.fn().mockResolvedValue(null),
        resolvePermissionsForUser: vi.fn().mockResolvedValue([]),
      } as unknown as RolesService,
      { findDefault: vi.fn().mockResolvedValue(null) } as unknown as PlansRepository,
      {} as unknown as TokenSessionManager,
    );
  });

  it('stores the IP and country on the new row', async () => {
    await manager.register(dto, { ip: '41.33.1.1', countryCode: 'EG' });
    expect(createUser.mock.calls[0]?.[0]).toMatchObject({
      registrationIp: '41.33.1.1',
      registrationCountryCode: 'EG',
      status: UserStatus.PENDING,
    });
  });

  it('stores nulls when the origin is unknown (and when no origin is passed)', async () => {
    await manager.register(dto);
    expect(createUser.mock.calls[0]?.[0]).toMatchObject({
      registrationIp: null,
      registrationCountryCode: null,
    });
  });

  it('never returns the IP to the registering client', async () => {
    const result = await manager.register(dto, { ip: '41.33.1.1', countryCode: 'EG' });
    expect(JSON.stringify(result)).not.toContain('41.33.1.1');
  });
});
