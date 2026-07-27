import { BillingGateway } from '@claw/shared-types';

import { RefundQueryService } from '../refund-query.service';

describe('RefundQueryService', () => {
  const repository = { listRefundableCharges: jest.fn() };
  const service = new RefundQueryService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only charges with a positive refundable balance', async () => {
    repository.listRefundableCharges.mockResolvedValueOnce([
      {
        id: 'charge-open',
        userId: 'user-1',
        subscriptionId: 'subscription-1',
        gateway: BillingGateway.PAYPAL,
        amountMinor: 10_000,
        currency: 'USD',
        capturedAt: new Date('2026-07-27T10:00:00.000Z'),
        reservedAmounts: [2_500],
      },
      {
        id: 'charge-closed',
        userId: 'user-2',
        subscriptionId: 'subscription-2',
        gateway: BillingGateway.PAYMOB,
        amountMinor: 5_000,
        currency: 'EGP',
        capturedAt: new Date('2026-07-26T10:00:00.000Z'),
        reservedAmounts: [5_000],
      },
    ]);

    await expect(service.listRefundableTransactions()).resolves.toEqual([
      {
        id: 'charge-open',
        userId: 'user-1',
        subscriptionId: 'subscription-1',
        gateway: BillingGateway.PAYPAL,
        capturedAmountMinor: 10_000,
        remainingAmountMinor: 7_500,
        currency: 'USD',
        capturedAt: '2026-07-27T10:00:00.000Z',
      },
    ]);
  });
});
