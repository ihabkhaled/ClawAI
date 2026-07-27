import { Permission, UserRole } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { RefundController } from '../refund.controller';

describe('RefundController', () => {
  const manager = { request: jest.fn() };
  const queries = { listRefundableTransactions: jest.fn() };
  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    username: 'admin',
    role: UserRole.ADMIN,
    permissions: [Permission.ADMIN_PLANS_MANAGE],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives the operator identity from the authenticated principal', async () => {
    const controller = new RefundController(manager as never, queries as never);
    const dto = {
      paymentTransactionId: 'charge-1',
      amountMinor: 2_500,
      idempotencyKey: 'refund-request-1',
      reason: 'Customer request',
    };

    await controller.create(admin, dto);

    expect(manager.request).toHaveBeenCalledWith({
      ...dto,
      requestedByUserId: 'admin-1',
    });
  });

  it('lists refundable transactions for the admin workflow', async () => {
    queries.listRefundableTransactions.mockResolvedValueOnce([]);
    const controller = new RefundController(manager as never, queries as never);

    await expect(controller.listRefundableTransactions()).resolves.toEqual([]);
  });

  it('requires the billing administration permission for every route', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, RefundController)).toEqual([
      Permission.ADMIN_PLANS_MANAGE,
    ]);
  });
});
