import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ReconciliationAdminController } from '../reconciliation-admin.controller';

jest.mock('../../managers/reconciliation.manager', () => ({
  ReconciliationManager: class ReconciliationManager {},
}));

describe('ReconciliationAdminController', () => {
  it('requires the exact plan-management permission', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ReconciliationAdminController)).toEqual([
      Permission.ADMIN_PLANS_MANAGE,
    ]);
  });

  it('delegates a manual run to the owner-safe reconciliation manager', async () => {
    const result = {
      scannedCount: 4,
      repairedCount: 1,
      quarantinedCount: 1,
      unprocessedCount: 2,
    };
    const manager = { reconcile: jest.fn().mockResolvedValue(result) };
    const controller = new ReconciliationAdminController(manager as never);

    await expect(controller.run()).resolves.toEqual(result);
    expect(manager.reconcile).toHaveBeenCalledWith();
  });
});
