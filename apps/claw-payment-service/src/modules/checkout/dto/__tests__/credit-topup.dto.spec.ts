import { BillingGateway } from '@claw/shared-types';

import { createCreditTopupSessionSchema } from '../credit-topup.dto';

const VALID = {
  packageId: 'pkg-25',
  gateway: BillingGateway.PAYPAL,
  idempotencyKey: 'idem-abcdefgh',
};

describe('createCreditTopupSessionSchema', () => {
  it('accepts a package id, a gateway and an idempotency key', () => {
    const parsed = createCreditTopupSessionSchema.safeParse(VALID);

    expect(parsed.success).toBe(true);
  });

  it('has no amount field at all — the price is server-resolved', () => {
    const parsed = createCreditTopupSessionSchema.safeParse(VALID);

    expect(parsed.success).toBe(true);
    // Not merely "amountMinor was ignored": the parsed object's key set IS the
    // contract, and it contains nothing financial.
    expect(Object.keys(parsed.success ? parsed.data : {}).sort()).toEqual([
      'gateway',
      'idempotencyKey',
      'packageId',
    ]);
  });

  it.each([
    ['amountMinor', { amountMinor: 1 }],
    ['baseAmountMinor', { baseAmountMinor: 1 }],
    ['chargeAmountMinor', { chargeAmountMinor: 1 }],
    ['creditMicroUsd', { creditMicroUsd: 100_000_000 }],
    ['currency', { currency: 'USD' }],
    ['packageVersionId', { packageVersionId: 'cpv-cheap' }],
    ['userId', { userId: 'someone-else' }],
  ])('rejects a body that tries to state %s', (_label, extra) => {
    const parsed = createCreditTopupSessionSchema.safeParse({ ...VALID, ...extra });

    // `.strict()` is what makes this a rejection rather than a silent drop. A
    // dropped field is safe today and one careless spread away from being a
    // price the buyer chose.
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown gateway rather than defaulting to one', () => {
    const parsed = createCreditTopupSessionSchema.safeParse({ ...VALID, gateway: 'FREE_MONEY' });

    expect(parsed.success).toBe(false);
  });

  it('requires an idempotency key long enough not to collide by accident', () => {
    const parsed = createCreditTopupSessionSchema.safeParse({ ...VALID, idempotencyKey: 'short' });

    expect(parsed.success).toBe(false);
  });

  it('bounds the package id', () => {
    const parsed = createCreditTopupSessionSchema.safeParse({
      ...VALID,
      packageId: 'p'.repeat(65),
    });

    expect(parsed.success).toBe(false);
  });
});
