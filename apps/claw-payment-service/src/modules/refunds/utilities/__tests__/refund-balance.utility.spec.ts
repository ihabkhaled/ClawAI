import { calculateRemainingRefundableMinor } from '../refund-balance.utility';

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
