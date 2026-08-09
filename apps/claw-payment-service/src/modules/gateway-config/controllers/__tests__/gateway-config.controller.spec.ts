import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { BillingGateway, Permission } from '@claw/shared-types';

import { AdminGatewayConfigController } from '../admin-gateway-config.controller';
import { CheckoutGatewaysController } from '../checkout-gateways.controller';

describe('Gateway configuration controllers', () => {
  const service = {
    listAdmin: jest.fn(),
    listCheckout: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('keeps the checkout projection public and delegates to the service', async () => {
    service.listCheckout.mockResolvedValue([{ gateway: BillingGateway.PAYPAL }]);
    const controller = new CheckoutGatewaysController(service as never);

    await expect(controller.list()).resolves.toEqual([{ gateway: BillingGateway.PAYPAL }]);
    expect(service.listCheckout).toHaveBeenCalledTimes(1);
  });

  it('protects admin gateway configuration with the plan-management permission', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, AdminGatewayConfigController)).toEqual([
      Permission.ADMIN_PLANS_MANAGE,
    ]);
  });

  it('passes validated admin updates to the service', async () => {
    service.update.mockResolvedValue({ gateway: BillingGateway.PAYPAL, isEnabled: true });
    const controller = new AdminGatewayConfigController(service as never);

    await expect(
      controller.update({ gateway: BillingGateway.PAYPAL }, { isEnabled: true }),
    ).resolves.toEqual({ gateway: BillingGateway.PAYPAL, isEnabled: true });
    expect(service.update).toHaveBeenCalledWith(BillingGateway.PAYPAL, { isEnabled: true });
  });
});
