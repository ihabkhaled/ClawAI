import { createPaymentMethodSetupSessionSchema } from '../checkout.dto';

describe('createPaymentMethodSetupSessionSchema', () => {
  it('accepts explicit consent with a bounded idempotency key', () => {
    expect(
      createPaymentMethodSetupSessionSchema.safeParse({
        idempotencyKey: 'setup-idempotency-1',
        consentToStore: true,
      }).success,
    ).toBe(true);
  });

  it.each([
    { idempotencyKey: 'short', consentToStore: true },
    { idempotencyKey: 'setup-idempotency-1', consentToStore: false },
    { idempotencyKey: 'setup-idempotency-1' },
    {
      idempotencyKey: 'setup-idempotency-1',
      consentToStore: true,
      amountMinor: 1,
    },
  ])('rejects an unsafe setup request', (input) => {
    expect(createPaymentMethodSetupSessionSchema.safeParse(input).success).toBe(false);
  });
});
