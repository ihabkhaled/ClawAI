import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { BillingDashboardController } from '../billing-dashboard.controller';

describe('BillingDashboardController authorization', () => {
  it('requires ADMIN_PLANS_MANAGE at the server boundary', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, BillingDashboardController)).toEqual([
      Permission.ADMIN_PLANS_MANAGE,
    ]);
  });
});
