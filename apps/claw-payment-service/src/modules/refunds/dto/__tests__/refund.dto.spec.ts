import { createRefundSchema } from '../refund.dto';

describe('createRefundSchema', () => {
  const valid = {
    paymentTransactionId: 'charge-1',
    amountMinor: 2_500,
    idempotencyKey: 'refund-request-1',
    reason: 'Customer requested a partial refund',
  };

  it('accepts integer minor units and no client-supplied currency or user id', () => {
    expect(createRefundSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['zero amount', { ...valid, amountMinor: 0 }],
    ['fractional amount', { ...valid, amountMinor: 2_500.5 }],
    ['missing reason', { ...valid, reason: '' }],
    ['short idempotency key', { ...valid, idempotencyKey: 'short' }],
    ['client currency', { ...valid, currency: 'USD' }],
    ['client user id', { ...valid, userId: 'customer-2' }],
  ])('rejects %s', (_label, payload) => {
    expect(createRefundSchema.safeParse(payload).success).toBe(false);
  });
});
