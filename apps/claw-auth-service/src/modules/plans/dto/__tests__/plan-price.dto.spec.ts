import { publishPlanPriceSchema } from '../plan-price.dto';

describe('publishPlanPriceSchema', () => {
  it.each(['USD', 'EUR', 'EGP'])('accepts the supported currency %s', (currency) => {
    expect(
      publishPlanPriceSchema.safeParse({
        billingInterval: 'MONTHLY',
        currency,
        amountMinor: 100,
      }).success,
    ).toBe(true);
  });

  it('rejects an unsupported three-letter currency', () => {
    expect(
      publishPlanPriceSchema.safeParse({
        billingInterval: 'MONTHLY',
        currency: 'CHF',
        amountMinor: 100,
      }).success,
    ).toBe(false);
  });
});
