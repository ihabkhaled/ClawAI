import { RefundStatus as SharedRefundStatus } from '@claw/shared-types';

import { RefundStatus } from '../../../../generated/prisma';
import { toRefundView } from '../refund-view.utility';

describe('toRefundView', () => {
  it('exposes only the public refund contract', () => {
    const view = toRefundView({
      id: 'refund-1',
      paymentTransactionId: 'charge-1',
      subscriptionId: 'subscription-1',
      invoiceId: null,
      userId: 'user-1',
      requestedByUserId: 'admin-1',
      gateway: 'PAYPAL',
      status: RefundStatus.SUCCEEDED,
      amountMinor: 2_500,
      currency: 'USD',
      idempotencyKey: 'request-key',
      providerIdempotencyKey: 'provider-key',
      providerRefundId: 'provider-refund-1',
      reason: 'Customer request',
      failureCode: null,
      completedAt: new Date('2026-07-27T10:05:00.000Z'),
      createdAt: new Date('2026-07-27T10:00:00.000Z'),
      updatedAt: new Date('2026-07-27T10:05:00.000Z'),
    });

    expect(view).toEqual({
      id: 'refund-1',
      paymentTransactionId: 'charge-1',
      status: SharedRefundStatus.SUCCEEDED,
      amountMinor: 2_500,
      currency: 'USD',
      reason: 'Customer request',
      createdAt: '2026-07-27T10:00:00.000Z',
      completedAt: '2026-07-27T10:05:00.000Z',
    });
    expect(JSON.stringify(view)).not.toContain('provider-key');
  });
});
