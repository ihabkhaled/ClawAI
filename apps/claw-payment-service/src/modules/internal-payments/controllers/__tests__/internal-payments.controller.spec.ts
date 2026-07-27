import { Test } from '@nestjs/testing';

import { InternalPaymentsService } from '../../services/internal-payments.service';
import { InternalPaymentsController } from '../internal-payments.controller';

describe('InternalPaymentsController', () => {
  const payments = {
    getPaymentStatus: jest.fn(),
    getSubscriptionStatus: jest.fn(),
    getAuthoritativeEntitlement: jest.fn(),
  };
  let controller: InternalPaymentsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [InternalPaymentsController],
      providers: [{ provide: InternalPaymentsService, useValue: payments }],
    }).compile();
    controller = module.get(InternalPaymentsController);
  });

  it('delegates each route to exactly one service operation', async () => {
    await controller.getPaymentStatus({ id: 'payment-1' });
    await controller.getSubscriptionStatus({ id: 'subscription-1' });
    await controller.getAuthoritativeEntitlement({ userId: 'user-1' });

    expect(payments.getPaymentStatus).toHaveBeenCalledWith('payment-1');
    expect(payments.getSubscriptionStatus).toHaveBeenCalledWith('subscription-1');
    expect(payments.getAuthoritativeEntitlement).toHaveBeenCalledWith('user-1');
  });
});
