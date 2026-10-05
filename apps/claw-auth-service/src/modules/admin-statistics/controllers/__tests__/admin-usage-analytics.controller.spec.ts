import { vi } from 'vitest';
import { Permission } from '@claw/shared-types';

import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { ROLES_KEY } from '../../../../app/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums';
import { AdminUsageAnalyticsController } from '../admin-usage-analytics.controller';
import { AdminUserStatisticsController } from '../admin-user-statistics.controller';

describe('admin usage analytics RBAC', () => {
  it.each([AdminUsageAnalyticsController, AdminUserStatisticsController])(
    '%o is admin-only and needs ADMIN_USAGE_VIEW',
    (controller) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual([UserRole.ADMIN]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller)).toEqual([
        Permission.ADMIN_USAGE_VIEW,
      ]);
    },
  );

  it('the per-user breakdown inherits the class permission (no override)', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AdminUserStatisticsController.prototype.getUsageBreakdown,
      ),
    ).toBeUndefined();
  });

  it('delegates to the service with the validated query', async () => {
    const service = { getOverview: vi.fn().mockResolvedValue({ ok: true }) };
    const controller = new AdminUsageAnalyticsController(service as never);
    await controller.getOverview({ hours: 6, limit: 10 });
    expect(service.getOverview).toHaveBeenCalledWith({ hours: 6, limit: 10 });
  });
});
