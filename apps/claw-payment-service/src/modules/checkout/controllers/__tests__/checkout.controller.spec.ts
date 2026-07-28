import { Test } from '@nestjs/testing';
import { UserRole } from '@claw/shared-types';

import { PlanCatalogClient } from '../../../plan-catalog/plan-catalog.client';
import { CheckoutService } from '../../services/checkout.service';
import { PaymentMethodSetupService } from '../../services/payment-method-setup.service';
import { PaypalCheckoutCompletionService } from '../../services/paypal-checkout-completion.service';
import { CheckoutController } from '../checkout.controller';

describe('CheckoutController', () => {
  const checkout = { findOwned: jest.fn(), start: jest.fn() };
  const paymentMethodSetup = { start: jest.fn() };
  const catalog = { listCatalog: jest.fn() };
  const paypalCompletion = { complete: jest.fn() };
  let controller: CheckoutController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [
        { provide: CheckoutService, useValue: checkout },
        { provide: PaymentMethodSetupService, useValue: paymentMethodSetup },
        { provide: PlanCatalogClient, useValue: catalog },
        { provide: PaypalCheckoutCompletionService, useValue: paypalCompletion },
      ],
    }).compile();
    controller = module.get(CheckoutController);
  });

  it('binds PayPal completion to the authenticated user and route session', async () => {
    paypalCompletion.complete.mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
    });

    await controller.completePaypal(
      {
        id: 'user-1',
        email: 'owner@example.com',
        role: UserRole.USER,
        sessionId: 'auth-session-1',
      },
      { id: 'session-1' },
      {
        providerOrderId: '5O190127TN364715T',
        state: 'a'.repeat(64),
      },
    );

    expect(paypalCompletion.complete).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-1',
      providerOrderId: '5O190127TN364715T',
      state: 'a'.repeat(64),
    });
  });
});
