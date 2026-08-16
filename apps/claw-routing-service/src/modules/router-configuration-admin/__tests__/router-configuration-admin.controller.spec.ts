import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { RouterConfigurationAdminController } from '../controllers/router-configuration-admin.controller';
import { ROLES_KEY } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types';
import type { RouterConfigurationAdminService } from '../services/router-configuration-admin.service';

// This is global routing policy (which providers/models the router may pick),
// not per-user data — the same class-level guard shape as RoutingController,
// restricted to ADMIN/OPERATOR and gated on the existing ADMIN_ROUTING_MANAGE
// permission (no new permission was added for this surface).
describe('RouterConfigurationAdminController authorization', () => {
  it('is restricted at the class level to exactly ADMIN and OPERATOR', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, RouterConfigurationAdminController) as
      UserRole[] | undefined;
    expect(roles).toEqual([UserRole.ADMIN, UserRole.OPERATOR]);
  });

  it('does not grant access to the read-only VIEWER role', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, RouterConfigurationAdminController) as
      UserRole[] | undefined;
    expect(roles).not.toContain(UserRole.VIEWER);
  });

  it('requires ADMIN_ROUTING_MANAGE and no other permission', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, RouterConfigurationAdminController),
    ).toEqual([Permission.ADMIN_ROUTING_MANAGE]);
  });
});

describe('RouterConfigurationAdminController delegation', () => {
  const service = {
    list: jest.fn(),
    getById: jest.fn(),
    createDraft: jest.fn(),
    updateEntries: jest.fn(),
    updateFields: jest.fn(),
    publish: jest.fn(),
    setEnabled: jest.fn(),
  };

  const controller = new RouterConfigurationAdminController(
    service as unknown as RouterConfigurationAdminService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('list forwards the validated query', async () => {
    service.list.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    await controller.list({ scope: 'GLOBAL', page: 1, limit: 50 } as never);
    expect(service.list).toHaveBeenCalledWith({ scope: 'GLOBAL', page: 1, limit: 50 });
  });

  it('create forwards the validated body', async () => {
    service.createDraft.mockResolvedValue({ id: 'config_1' });
    await controller.create({ scope: 'GLOBAL' });
    expect(service.createDraft).toHaveBeenCalledWith({ scope: 'GLOBAL' });
  });

  it('enable forwards scope with enabled=true', async () => {
    service.setEnabled.mockResolvedValue({ id: 'config_1', enabled: true });
    await controller.enable({ scope: 'GLOBAL' });
    expect(service.setEnabled).toHaveBeenCalledWith('GLOBAL', true);
  });

  it('disable forwards scope with enabled=false', async () => {
    service.setEnabled.mockResolvedValue({ id: 'config_1', enabled: false });
    await controller.disable({ scope: 'GLOBAL' });
    expect(service.setEnabled).toHaveBeenCalledWith('GLOBAL', false);
  });

  it('getById forwards the id param', async () => {
    service.getById.mockResolvedValue({ id: 'config_1' });
    await controller.getById('config_1');
    expect(service.getById).toHaveBeenCalledWith('config_1');
  });

  it('updateEntries forwards id and validated body', async () => {
    service.updateEntries.mockResolvedValue({ id: 'config_1' });
    await controller.updateEntries('config_1', { entries: [] });
    expect(service.updateEntries).toHaveBeenCalledWith('config_1', { entries: [] });
  });

  it('updateFields forwards id and validated body', async () => {
    service.updateFields.mockResolvedValue({ id: 'config_1', totalDeadlineMs: 15_000 });
    await controller.updateFields('config_1', { totalDeadlineMs: 15_000 });
    expect(service.updateFields).toHaveBeenCalledWith('config_1', { totalDeadlineMs: 15_000 });
  });

  it('publish forwards id and the authenticated user id', async () => {
    service.publish.mockResolvedValue({ id: 'config_1' });
    const user: AuthenticatedUser = {
      id: 'user_1',
      email: 'admin@claw.local',
      role: UserRole.ADMIN,
    };
    await controller.publish('config_1', user);
    expect(service.publish).toHaveBeenCalledWith('config_1', 'user_1');
  });
});
