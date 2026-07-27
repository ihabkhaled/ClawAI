import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { InternalPaymentsRepository } from '../internal-payments.repository';

describe('InternalPaymentsRepository', () => {
  const paymentTransaction = {
    findUnique: jest.fn(),
  };
  const subscription = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  };
  let repository: InternalPaymentsRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InternalPaymentsRepository,
        {
          provide: PrismaService,
          useValue: { paymentTransaction, subscription },
        },
      ],
    }).compile();
    repository = module.get(InternalPaymentsRepository);
  });

  it('looks payment and subscription status up by their internal ids', async () => {
    await repository.findPaymentById('payment-1');
    await repository.findSubscriptionById('subscription-1');

    expect(paymentTransaction.findUnique).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
    });
    expect(subscription.findUnique).toHaveBeenCalledWith({
      where: { id: 'subscription-1' },
    });
  });

  it('prefers the unique entitlement-bearing subscription', async () => {
    const active = { id: 'active-1' };
    subscription.findUnique.mockResolvedValue(active);

    await expect(repository.findAuthoritativeSubscriptionForUser('user-1')).resolves.toBe(active);
    expect(subscription.findFirst).not.toHaveBeenCalled();
  });

  it('falls back to the latest terminal subscription for a free entitlement answer', async () => {
    subscription.findUnique.mockResolvedValue(null);

    await repository.findAuthoritativeSubscriptionForUser('user-1');

    expect(subscription.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { updatedAt: 'desc' },
    });
  });
});
