import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { type AdminUserSubscriptionStatistics, Permission } from '@claw/shared-types';

import { adminUserParamSchema } from '../../dto/admin-user-billing.dto';
import { type AdminUserBillingService } from '../../services/admin-user-billing.service';
import { AdminUserBillingController } from '../admin-user-billing.controller';

const STATISTICS: AdminUserSubscriptionStatistics = {
  userId: 'user_1',
  generatedAt: '2026-09-06T12:00:00.000Z',
  subscription: null,
  periodLengthMonths: null,
  nextRenewalAt: null,
  monthsPaid: 0,
  totalPaidMinor: [],
  subscriptionHistory: [],
  recentInvoices: [],
};

describe('AdminUserBillingController', () => {
  it('requires ADMIN_PLANS_MANAGE at the server boundary', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, AdminUserBillingController)).toEqual([
      Permission.ADMIN_PLANS_MANAGE,
    ]);
  });

  it('passes the validated userId straight to the service and returns its answer', async () => {
    const getSubscriptionStatistics = jest.fn().mockResolvedValue(STATISTICS);
    const billing: Partial<AdminUserBillingService> = { getSubscriptionStatistics };
    const controller = new AdminUserBillingController(billing as AdminUserBillingService);

    const result = await controller.getSubscriptionStatistics({ userId: 'user_1' });

    expect(getSubscriptionStatistics).toHaveBeenCalledWith('user_1');
    expect(result).toBe(STATISTICS);
  });
});

describe('adminUserParamSchema', () => {
  it('accepts a normal user id', () => {
    expect(adminUserParamSchema.parse({ userId: 'cmsgstkyk004139o8r5wg00mv' })).toEqual({
      userId: 'cmsgstkyk004139o8r5wg00mv',
    });
  });

  it('rejects an empty user id', () => {
    expect(adminUserParamSchema.safeParse({ userId: '' }).success).toBe(false);
  });

  it('rejects an unbounded user id', () => {
    expect(adminUserParamSchema.safeParse({ userId: 'x'.repeat(65) }).success).toBe(false);
  });
});
