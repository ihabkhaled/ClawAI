import { Permission, UserRole } from '@claw/shared-types';
import { RolesService } from '../roles.service';
import { type RolesRepository } from '../../repositories/roles.repository';

const adminRole = {
  id: 'role-admin',
  slug: UserRole.ADMIN,
  name: 'Administrator',
  description: null,
  isSystem: true,
  isAssignable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  permissions: [
    { permission: Permission.ADMIN_PERMISSIONS_MANAGE },
    { permission: Permission.CHAT_USE },
  ],
};

const customRole = {
  ...adminRole,
  id: 'role-support',
  slug: 'SUPPORT',
  name: 'Support',
  isSystem: false,
  permissions: [{ permission: Permission.ADMIN_USAGE_VIEW }],
};

const mockRepo = (): Record<keyof RolesRepository, jest.Mock> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  replacePermissions: jest.fn(),
  countUsersWithRole: jest.fn(),
  isSuperAdminActor: jest.fn().mockResolvedValue(true),
});

describe('RolesService', () => {
  let service: RolesService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(() => {
    repo = mockRepo();
    service = new RolesService(repo as unknown as RolesRepository);
  });

  describe('resolvePermissionsForUser', () => {
    it('resolves by roleId when present', async () => {
      repo.findById.mockResolvedValue(adminRole);
      const perms = await service.resolvePermissionsForUser('role-admin', UserRole.ADMIN);
      expect(perms).toContain(Permission.ADMIN_PERMISSIONS_MANAGE);
      expect(repo.findById).toHaveBeenCalledWith('role-admin');
    });

    it('falls back to USER slug for legacy non-admin users with no roleId', async () => {
      repo.findBySlug.mockResolvedValue(customRole);
      await service.resolvePermissionsForUser(null, UserRole.VIEWER);
      expect(repo.findBySlug).toHaveBeenCalledWith(UserRole.USER);
    });

    it('falls back to ADMIN slug for legacy admin users with no roleId', async () => {
      repo.findBySlug.mockResolvedValue(adminRole);
      await service.resolvePermissionsForUser(null, UserRole.ADMIN);
      expect(repo.findBySlug).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it('drops unknown permission strings not in the catalog', async () => {
      repo.findById.mockResolvedValue({
        ...customRole,
        permissions: [{ permission: 'GHOST_PERMISSION' }, { permission: Permission.CHAT_USE }],
      });
      const perms = await service.resolvePermissionsForUser('role-support', UserRole.USER);
      expect(perms).toEqual([Permission.CHAT_USE]);
    });
  });

  describe('setPermissions lockout guard', () => {
    it('rejects stripping ADMIN_PERMISSIONS_MANAGE from the ADMIN system role', async () => {
      repo.findById.mockResolvedValue(adminRole);
      await expect(
        service.setPermissions('role-admin', [Permission.CHAT_USE], 'super-1'),
      ).rejects.toThrow(/ADMIN_PERMISSIONS_MANAGE/);
      expect(repo.replacePermissions).not.toHaveBeenCalled();
    });

    it('allows editing a custom role freely', async () => {
      repo.findById.mockResolvedValue(customRole);
      repo.replacePermissions.mockResolvedValue({
        ...customRole,
        permissions: [{ permission: Permission.CHAT_USE }],
      });
      await service.setPermissions('role-support', [Permission.CHAT_USE], 'admin-2');
      expect(repo.replacePermissions).toHaveBeenCalledWith('role-support', [Permission.CHAT_USE]);
    });

    it('refuses a non-super administrator editing a SYSTEM role, before the lockout guard', async () => {
      // A system role's grant set is what every administrator's authority is made
      // of, so degrading it is an attack on the super administrator that never
      // touches the super administrator's user row.
      repo.findById.mockResolvedValue(adminRole);
      repo.isSuperAdminActor.mockResolvedValue(false);

      await expect(
        service.setPermissions('role-admin', [Permission.ADMIN_PERMISSIONS_MANAGE], 'admin-2'),
      ).rejects.toMatchObject({ code: 'SUPER_ADMIN_REQUIRED' });
      expect(repo.replacePermissions).not.toHaveBeenCalled();
    });

    it('lets a non-super administrator edit a CUSTOM role', async () => {
      repo.findById.mockResolvedValue(customRole);
      repo.isSuperAdminActor.mockResolvedValue(false);
      repo.replacePermissions.mockResolvedValue({
        ...customRole,
        permissions: [{ permission: Permission.CHAT_USE }],
      });

      await service.setPermissions('role-support', [Permission.CHAT_USE], 'admin-2');

      expect(repo.replacePermissions).toHaveBeenCalledWith('role-support', [Permission.CHAT_USE]);
    });
  });

  describe('deleteRole', () => {
    it('refuses to delete a system role', async () => {
      repo.findById.mockResolvedValue(adminRole);
      await expect(service.deleteRole('role-admin')).rejects.toThrow(/System roles/);
    });

    it('refuses to delete a role with assigned users', async () => {
      repo.findById.mockResolvedValue(customRole);
      repo.countUsersWithRole.mockResolvedValue(2);
      await expect(service.deleteRole('role-support')).rejects.toThrow(/still assigned/);
    });

    it('deletes an empty custom role', async () => {
      repo.findById.mockResolvedValue(customRole);
      repo.countUsersWithRole.mockResolvedValue(0);
      await service.deleteRole('role-support');
      expect(repo.delete).toHaveBeenCalledWith('role-support');
    });
  });

  describe('createRole', () => {
    it('rejects a duplicate slug', async () => {
      repo.findBySlug.mockResolvedValue(customRole);
      await expect(
        service.createRole({ slug: 'SUPPORT', name: 'x', isAssignable: true, permissions: [] }),
      ).rejects.toThrow(/already exists/);
    });
  });
});
