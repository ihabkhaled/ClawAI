import {
  completePaypalCheckoutSchema,
  createPaymentMethodSetupSessionSchema,
} from '../checkout.dto';

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

describe('completePaypalCheckoutSchema', () => {
  const validInput = {
    providerOrderId: '5O190127TN364715T',
    state: 'a'.repeat(64),
  };

  it('accepts the provider order and the exact checkout state nonce', () => {
    expect(completePaypalCheckoutSchema.safeParse(validInput).success).toBe(true);
  });

  it.each([
    { ...validInput, state: 'short' },
    { ...validInput, state: `${'a'.repeat(63)}g` },
    { ...validInput, providerOrderId: '' },
    { ...validInput, providerOrderId: 'x'.repeat(65) },
    { ...validInput, amountMinor: 1 },
  ])('rejects an unsafe PayPal completion request', (input) => {
    expect(completePaypalCheckoutSchema.safeParse(input).success).toBe(false);
  });
});
