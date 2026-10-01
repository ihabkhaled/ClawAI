import { PaygBillingMode, type PaygFinalizeOutcome } from '@claw/shared-types';

import { paygDisclosableCost } from '../payg-cost-disclosure.utility';

// The chat-side lock on a margin figure (F108). Only a reply that positively
// says PAYG and carries a clean integer may yield a cost; everything else is
// `undefined`, and zero is a real cost that must survive.
describe('paygDisclosableCost', () => {
  const outcome = (over: Record<string, unknown>): PaygFinalizeOutcome =>
    ({ settled: true, billingMode: PaygBillingMode.PAYG, ...over }) as PaygFinalizeOutcome;

  it('returns the cost for a PAYG user', () => {
    expect(paygDisclosableCost(outcome({ settledCostMicroUsd: 21_000 }))).toBe(21_000);
  });

  it('returns zero for a PAYG zero cost', () => {
    expect(paygDisclosableCost(outcome({ settledCostMicroUsd: 0 }))).toBe(0);
  });

  it.each([
    PaygBillingMode.SUBSCRIPTION,
    PaygBillingMode.UNKNOWN,
    'ENTERPRISE',
    undefined,
    null,
    7,
  ])('returns nothing for billing mode %s even with a cost attached', (billingMode) => {
    expect(paygDisclosableCost(outcome({ billingMode, settledCostMicroUsd: 21_000 }))).toBe(
      undefined,
    );
  });

  it.each([undefined, null, '21000', 1.5, -1, Number.NaN, Number.MAX_SAFE_INTEGER + 2])(
    'returns nothing for a PAYG cost of %s',
    (settledCostMicroUsd) => {
      expect(paygDisclosableCost(outcome({ settledCostMicroUsd }))).toBe(undefined);
    },
  );

  it('returns nothing when there is no settlement reply', () => {
    expect(paygDisclosableCost(undefined)).toBe(undefined);
  });
});
