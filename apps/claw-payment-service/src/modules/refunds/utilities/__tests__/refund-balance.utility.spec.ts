import {
  calculateProviderRefundMinor,
  calculateRemainingRefundableMinor,
} from '../refund-balance.utility';

describe('calculateRemainingRefundableMinor', () => {
  it('subtracts completed and pending refund reservations from the captured amount', () => {
    expect(calculateRemainingRefundableMinor(10_000, [2_500, 1_500])).toBe(6_000);
  });

  it('keeps all arithmetic in integer minor units', () => {
    expect(calculateRemainingRefundableMinor(101, [33, 33])).toBe(35);
  });

  it.each([
    { capturedMinor: 0, refunds: [], label: 'non-positive capture' },
    { capturedMinor: 100, refunds: [0], label: 'non-positive refund' },
    { capturedMinor: 100, refunds: [101], label: 'over-refunded ledger' },
    { capturedMinor: 100.5, refunds: [], label: 'fractional capture' },
    { capturedMinor: 100, refunds: [0.5], label: 'fractional refund' },
  ])('rejects a $label', ({ capturedMinor, refunds }) => {
    expect(() => calculateRemainingRefundableMinor(capturedMinor, refunds)).toThrow();
  });
});

describe('calculateProviderRefundMinor', () => {
  it('converts a partial canonical refund with integer arithmetic', () => {
    expect(calculateProviderRefundMinor(500, 24_750, 100, 500, [])).toBe(4_950);
  });

  it('assigns all remaining provider units to the final canonical refund', () => {
    expect(calculateProviderRefundMinor(3, 10, 2, 2, [3])).toBe(7);
  });

  it('never allocates more provider money than remains captured', () => {
    expect(() => calculateProviderRefundMinor(100, 1_000, 50, 100, [900])).toThrow();
  });
});
