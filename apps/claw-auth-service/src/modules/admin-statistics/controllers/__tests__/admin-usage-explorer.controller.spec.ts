import { Permission } from '@claw/shared-types';
import { vi } from 'vitest';

import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { ROLES_KEY } from '../../../../app/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums';
import { AdminUsageExplorerController } from '../admin-usage-explorer.controller';

describe('AdminUsageExplorerController', () => {
  it('is admin-only and gated on ADMIN_USAGE_VIEW', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminUsageExplorerController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AdminUsageExplorerController)).toEqual([
      Permission.ADMIN_USAGE_VIEW,
    ]);
  });

  it('passes the acting admin id to the audited reads', async () => {
    const explorer = {
      userDetail: vi.fn().mockResolvedValue({}),
      userRequests: vi.fn().mockResolvedValue({}),
      exportUsers: vi.fn().mockResolvedValue({}),
    };
    const controller = new AdminUsageExplorerController(explorer as never);
    const actor = { id: 'admin-1', email: 'a@b.co', role: UserRole.ADMIN, sessionId: 's' };

    await controller.getUser({ userId: 'u1' }, {} as never, actor);
    await controller.getUserRequests({ userId: 'u1' }, {} as never, actor);
    await controller.exportUsers({} as never, actor);

    expect(explorer.userDetail).toHaveBeenCalledWith('u1', {}, 'admin-1');
    expect(explorer.userRequests).toHaveBeenCalledWith('u1', {}, 'admin-1');
    expect(explorer.exportUsers).toHaveBeenCalledWith({}, 'admin-1');
  });
});
