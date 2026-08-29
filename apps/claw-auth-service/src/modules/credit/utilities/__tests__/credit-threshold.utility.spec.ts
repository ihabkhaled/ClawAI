import { PAYG_WARNING_THRESHOLDS } from '@claw/shared-constants';

import { crossedWarningThreshold } from '../credit-threshold.utility';

describe('crossedWarningThreshold', () => {
  const periodGrant = 1_000_000n; // $1.00

  it('says nothing while plenty is left', () => {
    expect(crossedWarningThreshold(900_000n, periodGrant, PAYG_WARNING_THRESHOLDS)).toBeNull();
  });

  it('fires at 80% consumed', () => {
    const crossed = crossedWarningThreshold(200_000n, periodGrant, PAYG_WARNING_THRESHOLDS);
    expect(crossed).not.toBeNull();
  });

  it('reports the TIGHTEST threshold once both are crossed', () => {
    const crossed = crossedWarningThreshold(40_000n, periodGrant, PAYG_WARNING_THRESHOLDS);
    expect(crossed?.percentConsumed).toBe(95);
  });

  // The absolute floor is the half that matters and the half that is easy to
  // leave out: on a large grant, "95% consumed" can still be plenty of money,
  // and on a small one it can already be less than a single request's hold.
  it('fires on the absolute floor even when the percentage is nowhere near', () => {
    const hugeGrant = 1_000_000_000n;
    const crossed = crossedWarningThreshold(100_000n, hugeGrant, PAYG_WARNING_THRESHOLDS);
    expect(crossed?.minRemainingMicroUsd).toBe(150_000);
  });

  it('still warns on a purchased-only wallet, where there is no percentage to speak of', () => {
    const crossed = crossedWarningThreshold(100_000n, 0n, PAYG_WARNING_THRESHOLDS);
    expect(crossed).not.toBeNull();
  });

  it('does not warn on a zero grant that still has ample purchased credit', () => {
    expect(crossedWarningThreshold(5_000_000n, 0n, PAYG_WARNING_THRESHOLDS)).toBeNull();
  });
});
