import { bpsToPercent, creditFromPayment, creditFromTopup } from '../credit-conversion.utility';

// The arithmetic that decides how much money a user gets. Every case here is a
// real plan or package from the seeded catalog, so a change to the conversion
// shows up as a change to a named product rather than an abstract number.
describe('creditFromPayment', () => {
  it("converts the user's example: $20 at 30% becomes $6.00", () => {
    expect(creditFromPayment(2000, 3000)).toBe(6_000_000n);
  });

  // These are the seeded rates, and they were chosen so that the derived grant
  // equals what each plan granted before the change. If one of them moves, a
  // real customer's allowance moved with it.
  it.each([
    ['starter', 500, 3000, 1_500_000n],
    ['plus', 1000, 3000, 3_000_000n],
    ['pro', 2000, 2500, 5_000_000n],
    ['team', 5000, 2500, 12_500_000n],
    ['scale', 10_000, 2500, 25_000_000n],
    ['unlimited', 20_000, 2500, 50_000_000n],
  ])('grants %s exactly what it granted before', (_slug, priceMinor, bps, expected) => {
    expect(creditFromPayment(priceMinor, bps)).toBe(expected);
  });

  // Free pays nothing, so it converts nothing. This is the one allowance that
  // moves, and it moves because of the model rather than a decision taken in
  // the arithmetic.
  it('grants nothing on a free plan, at any rate', () => {
    expect(creditFromPayment(0, 3000)).toBe(0n);
    expect(creditFromPayment(0, 10_000)).toBe(0n);
  });

  it('grants nothing when the rate is zero or unset', () => {
    expect(creditFromPayment(2000, 0)).toBe(0n);
  });

  // A share above 100% would hand back more credit than the payment covered.
  // The database CHECK rejects it; this is the second line of defence, because
  // a value can reach here from a seeder or a test fixture that never touched
  // the constraint.
  it('clamps a rate above 100% rather than minting credit', () => {
    expect(creditFromPayment(1000, 20_000)).toBe(creditFromPayment(1000, 10_000));
    expect(creditFromPayment(1000, 10_000)).toBe(10_000_000n);
  });

  it('refuses a negative or fractional payment instead of inventing one', () => {
    expect(creditFromPayment(-500, 3000)).toBe(0n);
    expect(creditFromPayment(12.5, 3000)).toBe(0n);
  });

  // Rounding DOWN, and multiplying before dividing. $0.01 at 30% is 3,000
  // micro-USD exactly; a rate that does not divide evenly must not round up,
  // because that hands out credit the payment did not cover.
  it('rounds down on a rate that does not divide evenly', () => {
    // 1 cent = 10,000 micro-USD; 33.33% of that is 3,333 micro-USD.
    expect(creditFromPayment(1, 3333)).toBe(3_333n);
  });

  // A yearly payment is large; the intermediate product must not silently lose
  // precision on the way through.
  it('stays exact on a payment far beyond a float-safe product', () => {
    // $10,000,000.00 at 25%: the naive product exceeds Number.MAX_SAFE_INTEGER.
    expect(creditFromPayment(1_000_000_000, 2500)).toBe(2_500_000_000_000n);
  });
});

describe('creditFromTopup', () => {
  // A top-up buys nothing but provider spend, so it sells at face value. The
  // platform's margin lives in the plan, not here — taking a second cut would
  // charge the customer twice for the same margin.
  it.each([
    [500, 5_000_000n],
    [1000, 10_000_000n],
    [2500, 25_000_000n],
    [5000, 50_000_000n],
    [10_000, 100_000_000n],
  ])('sells a %d-cent package at face value', (priceMinor, expected) => {
    expect(creditFromTopup(priceMinor, 10_000)).toBe(expected);
  });

  it("matches the user's example: $10 buys $10 of credit", () => {
    expect(creditFromTopup(1000, 10_000)).toBe(10_000_000n);
  });
});

describe('bpsToPercent', () => {
  it('renders a rate the way copy states it', () => {
    expect(bpsToPercent(3000)).toBe(30);
    expect(bpsToPercent(2500)).toBe(25);
    expect(bpsToPercent(10_000)).toBe(100);
  });
});
