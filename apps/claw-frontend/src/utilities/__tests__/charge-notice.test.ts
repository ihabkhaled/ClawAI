import { describe, expect, it } from 'vitest';

import { buildChargeNotice } from '@/utilities/billing.utility';

// Checkout is where a wrong number becomes a wrong charge, so the rule here is
// narrower than anywhere else: name an amount only when ClawAI has actually
// computed it.

describe('buildChargeNotice', () => {
  it('quotes the exact amount when the gateway settles in the plan currency', () => {
    // PayPal charges the canonical USD price however the visitor sees prices.
    const notice = buildChargeNotice(null, 'USD', '$10.00');
    expect(notice).toEqual({
      key: 'billing.checkout.chargedExactly',
      params: { amount: '$10.00' },
    });
  });

  it('names only the CURRENCY when the gateway converts', () => {
    // Paymob's EGP total comes from the server's settlement quote: newer than
    // any marketing rate, carrying the safety margin, not commercially rounded.
    // Quoting a figure here would be quoting a number nobody has computed, and
    // the user seeing a different one later would read as a broken checkout.
    const notice = buildChargeNotice('EGP', 'USD', '$10.00');
    expect(notice).toEqual({
      key: 'billing.checkout.chargedInCurrency',
      params: { currency: 'EGP' },
    });
    expect(JSON.stringify(notice)).not.toContain('10.00');
  });

  it('says nothing when the displayed price is already the settlement price', () => {
    expect(buildChargeNotice('USD', 'USD', '$10.00')).toBeNull();
    expect(buildChargeNotice('EGP', 'EGP', 'EGP 515.00')).toBeNull();
  });

  it('never carries a localized estimate into the charge sentence', () => {
    // The estimate is "≈ EGP 515". It must not reach this function's output in
    // any branch, because this sentence is about money that will move.
    for (const settlement of [null, 'EGP', 'USD']) {
      const notice = buildChargeNotice(settlement, 'USD', '$10.00');
      expect(JSON.stringify(notice ?? {})).not.toContain('≈');
    }
  });
});
