import { MoneyErrorCode } from '../money-error-code.enum';
import {
  applyBasisPoints,
  assertIntegerMinor,
  assertNonNegativeMinor,
  assertSupportedCurrency,
  formatMinorUnits,
  isSupportedCurrency,
  minorUnitExponent,
  minorUnitsPerMajor,
  multiplyByScaledRatio,
  parseMajorToMinor,
  roundHalfUpDivide,
  subtractFloorZero,
  sumMinor,
} from '../money.utility';
import { MoneyError } from '../money-error';

// Deterministic PRNG so the property loops below are reproducible on failure.
// A seeded generator gives the coverage of property testing without adding a
// dependency the rest of the repo does not carry.
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_00_00_00_00;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

describe('money.utility', () => {
  describe('assertIntegerMinor', () => {
    it('accepts integers including zero and negatives', () => {
      expect(() => {
        assertIntegerMinor(0, 'x');
      }).not.toThrow();
      expect(() => {
        assertIntegerMinor(-500, 'x');
      }).not.toThrow();
    });

    it('rejects a float, which is how a rounding bug enters a billing path', () => {
      expect(() => {
        assertIntegerMinor(5.5, 'amount');
      }).toThrow(MoneyError);
      try {
        assertIntegerMinor(5.5, 'amount');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.NON_INTEGER_AMOUNT);
      }
    });

    it('rejects NaN and Infinity', () => {
      expect(() => {
        assertIntegerMinor(Number.NaN, 'x');
      }).toThrow(MoneyError);
      expect(() => {
        assertIntegerMinor(Number.POSITIVE_INFINITY, 'x');
      }).toThrow(MoneyError);
    });

    it('rejects values beyond the safe integer range', () => {
      try {
        assertIntegerMinor(Number.MAX_SAFE_INTEGER + 2, 'x');
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.AMOUNT_OVERFLOW);
      }
    });
  });

  describe('assertNonNegativeMinor', () => {
    it('rejects a negative amount', () => {
      try {
        assertNonNegativeMinor(-1, 'price');
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.NEGATIVE_AMOUNT);
      }
    });

    it('accepts zero', () => {
      expect(() => {
        assertNonNegativeMinor(0, 'price');
      }).not.toThrow();
    });
  });

  describe('currency support', () => {
    it('recognises the configured billing currencies', () => {
      expect(isSupportedCurrency('USD')).toBe(true);
      expect(isSupportedCurrency('EGP')).toBe(true);
    });

    it('rejects an unlisted currency rather than assuming two decimals', () => {
      expect(isSupportedCurrency('JPY')).toBe(false);
      try {
        assertSupportedCurrency('JPY');
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.UNSUPPORTED_CURRENCY);
      }
    });

    it('is not fooled by prototype keys', () => {
      expect(isSupportedCurrency('toString')).toBe(false);
      expect(isSupportedCurrency('constructor')).toBe(false);
    });

    it('exposes the exponent and its power of ten', () => {
      expect(minorUnitExponent('USD')).toBe(2);
      expect(minorUnitsPerMajor('USD')).toBe(100);
    });
  });

  describe('roundHalfUpDivide', () => {
    it('rounds a half away from zero symmetrically', () => {
      expect(roundHalfUpDivide(5, 2)).toBe(3);
      expect(roundHalfUpDivide(-5, 2)).toBe(-3);
    });

    it('rounds below a half down', () => {
      expect(roundHalfUpDivide(4, 3)).toBe(1);
      expect(roundHalfUpDivide(-4, 3)).toBe(-1);
    });

    it('divides exactly when there is no remainder', () => {
      expect(roundHalfUpDivide(600, 3)).toBe(200);
    });

    it('rejects a zero denominator', () => {
      try {
        roundHalfUpDivide(1, 0);
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_SCALE);
      }
    });

    it('is sign-symmetric for every sampled pair', () => {
      const rng = createRng(20_260_725);
      for (let index = 0; index < 500; index += 1) {
        const numerator = randomInt(rng, 0, 10_000_000);
        const denominator = randomInt(rng, 1, 1_000_000);
        expect(roundHalfUpDivide(-numerator, denominator)).toBe(
          -roundHalfUpDivide(numerator, denominator),
        );
      }
    });
  });

  describe('formatMinorUnits', () => {
    it('renders a two-decimal currency', () => {
      expect(formatMinorUnits(500, 'USD')).toBe('5.00');
      expect(formatMinorUnits(2000, 'USD')).toBe('20.00');
      expect(formatMinorUnits(967, 'USD')).toBe('9.67');
    });

    it('pads a sub-unit amount', () => {
      expect(formatMinorUnits(5, 'USD')).toBe('0.05');
      expect(formatMinorUnits(0, 'USD')).toBe('0.00');
    });

    it('preserves a negative sign', () => {
      expect(formatMinorUnits(-967, 'USD')).toBe('-9.67');
    });
  });

  describe('parseMajorToMinor', () => {
    it('parses whole and fractional amounts', () => {
      expect(parseMajorToMinor('5', 'USD')).toBe(500);
      expect(parseMajorToMinor('5.00', 'USD')).toBe(500);
      expect(parseMajorToMinor('9.67', 'USD')).toBe(967);
      expect(parseMajorToMinor('0.05', 'USD')).toBe(5);
    });

    it('parses without float error', () => {
      // 0.29 * 100 === 28.999999999999996 in IEEE-754. String parsing must not.
      expect(parseMajorToMinor('0.29', 'USD')).toBe(29);
      expect(parseMajorToMinor('1.10', 'USD')).toBe(110);
    });

    it('parses a negative amount', () => {
      expect(parseMajorToMinor('-9.67', 'USD')).toBe(-967);
    });

    it('rejects a non-numeric string', () => {
      for (const bad of ['', 'abc', '1.2.3', '1,50', ' ', '1e3']) {
        try {
          parseMajorToMinor(bad, 'USD');
          throw new Error(`expected throw for "${bad}"`);
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_DECIMAL_STRING);
        }
      }
    });

    it('rejects precision the currency cannot represent', () => {
      try {
        parseMajorToMinor('1.005', 'USD');
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.EXCESSIVE_PRECISION);
      }
    });

    it('round-trips against formatMinorUnits for every sampled amount', () => {
      const rng = createRng(4242);
      for (let index = 0; index < 500; index += 1) {
        const minor = randomInt(rng, 0, 100_000_000);
        expect(parseMajorToMinor(formatMinorUnits(minor, 'USD'), 'USD')).toBe(minor);
      }
    });
  });

  describe('multiplyByScaledRatio', () => {
    it('applies a full ratio unchanged', () => {
      expect(multiplyByScaledRatio(2000, 1_000_000, 1_000_000)).toBe(2000);
    });

    it('applies a zero ratio', () => {
      expect(multiplyByScaledRatio(2000, 0, 1_000_000)).toBe(0);
    });

    it('applies the spec worked example (29/30 of $20)', () => {
      const ratio = roundHalfUpDivide(29 * 1_000_000, 30);
      expect(multiplyByScaledRatio(2000, ratio, 1_000_000)).toBe(1933);
    });

    it('rejects a non-positive scale', () => {
      for (const scale of [0, -1, 1.5]) {
        try {
          multiplyByScaledRatio(100, 100, scale);
          throw new Error('expected throw');
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_SCALE);
        }
      }
    });

    it('rejects an overflowing product rather than losing precision', () => {
      try {
        multiplyByScaledRatio(Number.MAX_SAFE_INTEGER - 1, 1_000_000, 1_000_000);
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.AMOUNT_OVERFLOW);
      }
    });

    it('never exceeds the original amount for a ratio <= 1', () => {
      const rng = createRng(7);
      for (let index = 0; index < 500; index += 1) {
        const amount = randomInt(rng, 0, 1_000_000);
        const ratio = randomInt(rng, 0, 1_000_000);
        expect(multiplyByScaledRatio(amount, ratio, 1_000_000)).toBeLessThanOrEqual(amount);
      }
    });
  });

  describe('applyBasisPoints', () => {
    it('leaves the amount untouched at zero bps', () => {
      expect(applyBasisPoints(10_000, 0)).toBe(10_000);
    });

    it('adds a 150 bps margin', () => {
      expect(applyBasisPoints(10_000, 150)).toBe(10_150);
    });

    it('adds a 100 % margin at 10000 bps', () => {
      expect(applyBasisPoints(500, 10_000)).toBe(1000);
    });
  });

  describe('sumMinor', () => {
    it('sums an empty list to zero', () => {
      expect(sumMinor([])).toBe(0);
    });

    it('sums positive and negative lines, as an invoice does', () => {
      expect(sumMinor([3000, -2000, 150])).toBe(1150);
    });

    it('rejects a float in the list', () => {
      expect(() => sumMinor([100, 0.5])).toThrow(MoneyError);
    });
  });

  describe('subtractFloorZero', () => {
    it('subtracts normally when the result is positive', () => {
      expect(subtractFloorZero(3000, 2000)).toBe(1000);
    });

    it('clamps at zero when the credit exceeds the charge', () => {
      // A downgrade credit larger than the new charge must not become a
      // negative amount due (which some gateways would treat as a payout).
      expect(subtractFloorZero(1000, 5000)).toBe(0);
    });

    it('never returns a negative for any sampled pair', () => {
      const rng = createRng(99);
      for (let index = 0; index < 500; index += 1) {
        const left = randomInt(rng, 0, 500_000);
        const right = randomInt(rng, 0, 500_000);
        expect(subtractFloorZero(left, right)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
