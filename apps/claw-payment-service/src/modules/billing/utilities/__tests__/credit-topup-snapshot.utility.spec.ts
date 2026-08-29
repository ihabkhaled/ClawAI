import {
  proportionalCreditMicroUsd,
  readCreditTopupSnapshot,
} from '../credit-topup-snapshot.utility';

const SNAPSHOT = {
  packageId: 'pkg-25',
  packageVersionId: 'cpv-9',
  creditMicroUsd: '15000000',
  amountMinor: 2500,
  currency: 'USD',
};

describe('readCreditTopupSnapshot', () => {
  it('reads a well-formed snapshot back', () => {
    expect(readCreditTopupSnapshot(SNAPSHOT)).toEqual(SNAPSHOT);
  });

  it.each([
    ['null', null],
    ['an array', [SNAPSHOT]],
    ['a string', JSON.stringify(SNAPSHOT)],
    ['a number', 42],
  ])('refuses %s rather than guessing', (_label, value) => {
    expect(readCreditTopupSnapshot(value)).toBeNull();
  });

  it.each([
    ['packageId', { packageId: 7 }],
    ['packageVersionId', { packageVersionId: null }],
    ['currency', { currency: 3 }],
    ['amountMinor', { amountMinor: '2500' }],
  ])('refuses a snapshot whose %s has the wrong type', (_label, overrides) => {
    expect(readCreditTopupSnapshot({ ...SNAPSHOT, ...overrides })).toBeNull();
  });

  it('refuses a credit figure that is not a plain decimal integer string', () => {
    // A number here would have been rounded by JSON before it ever arrived, and
    // reversing a rounded figure is a wallet quietly wrong.
    expect(readCreditTopupSnapshot({ ...SNAPSHOT, creditMicroUsd: 15_000_000 })).toBeNull();
    expect(readCreditTopupSnapshot({ ...SNAPSHOT, creditMicroUsd: '1.5e7' })).toBeNull();
    expect(readCreditTopupSnapshot({ ...SNAPSHOT, creditMicroUsd: '-15000000' })).toBeNull();
  });
});

describe('proportionalCreditMicroUsd', () => {
  it('returns the whole grant for a full reversal', () => {
    expect(proportionalCreditMicroUsd(15_000_000n, 2500, 2500)).toBe(15_000_000n);
  });

  it('never reverses more credit than the charge granted', () => {
    // A gateway that reports a larger reversal than the original capture must
    // not claw back credit the money never bought.
    expect(proportionalCreditMicroUsd(15_000_000n, 9999, 2500)).toBe(15_000_000n);
  });

  it('scales a partial refund with exact integer arithmetic', () => {
    expect(proportionalCreditMicroUsd(15_000_000n, 1250, 2500)).toBe(7_500_000n);
    expect(proportionalCreditMicroUsd(15_000_000n, 500, 2500)).toBe(3_000_000n);
  });

  it('floors a remainder rather than rounding up', () => {
    // 15,000,000 * 1 / 7 = 2,142,857.14…  Rounding up would reverse a micro-USD
    // the returned money never paid for.
    expect(proportionalCreditMicroUsd(15_000_000n, 1, 7)).toBe(2_142_857n);
  });

  it('stays exact far above Number.MAX_SAFE_INTEGER', () => {
    const huge = 9_007_199_254_740_993n;
    expect(proportionalCreditMicroUsd(huge, 1, 1)).toBe(huge);
    expect(proportionalCreditMicroUsd(huge, 1, 2)).toBe(4_503_599_627_370_496n);
  });

  it.each([
    ['no credit was granted', 0n, 100, 100],
    ['nothing was returned', 15_000_000n, 0, 100],
    ['the original charge was zero', 15_000_000n, 100, 0],
    ['the reversal is negative', 15_000_000n, -100, 100],
  ])('returns zero when %s', (_label, granted, reversed, charged) => {
    expect(proportionalCreditMicroUsd(granted, reversed, charged)).toBe(0n);
  });
});
