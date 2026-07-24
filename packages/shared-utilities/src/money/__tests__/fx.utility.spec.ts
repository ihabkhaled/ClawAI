import { FX_RATE_SCALE } from '@claw/shared-constants';

import {
  applySafetyMarginToRate,
  convertMinorUnits,
  isFxQuoteExpired,
  parseRateToScaled,
} from '../fx.utility';
import { type MoneyError } from '../money-error';
import { MoneyErrorCode } from '../money-error-code.enum';

// 48.75 EGP per USD, in scaled integer form.
const RATE_48_75 = 487_500_000;

describe('fx.utility', () => {
  describe('parseRateToScaled', () => {
    it('scales a fractional rate exactly', () => {
      expect(parseRateToScaled('48.75')).toBe(RATE_48_75);
      expect(parseRateToScaled('1')).toBe(FX_RATE_SCALE);
      expect(parseRateToScaled('0.5')).toBe(FX_RATE_SCALE / 2);
    });

    it('tolerates surrounding whitespace', () => {
      expect(parseRateToScaled('  48.75  ')).toBe(RATE_48_75);
    });

    it('rejects a malformed or signed rate', () => {
      for (const bad of ['', 'abc', '-1', '1.2.3', '1e3', '48,75']) {
        try {
          parseRateToScaled(bad);
          throw new Error(`expected throw for "${bad}"`);
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_DECIMAL_STRING);
        }
      }
    });

    it('rejects precision beyond the configured scale', () => {
      try {
        parseRateToScaled('48.123456789');
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.EXCESSIVE_PRECISION);
      }
    });
  });

  describe('applySafetyMarginToRate', () => {
    it('leaves the rate untouched at zero bps', () => {
      expect(applySafetyMarginToRate(RATE_48_75, 0)).toBe(RATE_48_75);
    });

    it('raises the rate by 150 bps', () => {
      // 48.75 * 1.015 = 49.48125
      expect(applySafetyMarginToRate(RATE_48_75, 150)).toBe(494_812_500);
    });

    it('always quotes at least the source rate, protecting against FX loss', () => {
      for (const bps of [0, 1, 50, 150, 1000]) {
        expect(applySafetyMarginToRate(RATE_48_75, bps)).toBeGreaterThanOrEqual(RATE_48_75);
      }
    });

    it('rejects a non-positive rate or negative margin', () => {
      for (const args of [
        [0, 150],
        [-1, 150],
        [RATE_48_75, -1],
        [RATE_48_75, 1.5],
      ] as const) {
        try {
          applySafetyMarginToRate(args[0], args[1]);
          throw new Error('expected throw');
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_SCALE);
        }
      }
    });
  });

  describe('convertMinorUnits', () => {
    it('converts $5.00 to EGP at 48.75', () => {
      // 500 minor USD * 48.75 = 24375 minor EGP = 243.75 EGP
      expect(convertMinorUnits(500, 'USD', 'EGP', RATE_48_75)).toBe(24_375);
    });

    it('converts $200.00 (the Unlimited monthly price) without overflow', () => {
      expect(convertMinorUnits(20_000, 'USD', 'EGP', RATE_48_75)).toBe(975_000);
    });

    it('is identity at a rate of exactly 1 between same-exponent currencies', () => {
      expect(convertMinorUnits(1234, 'USD', 'EGP', FX_RATE_SCALE)).toBe(1234);
    });

    it('converts zero to zero', () => {
      expect(convertMinorUnits(0, 'USD', 'EGP', RATE_48_75)).toBe(0);
    });

    it('rejects an unsupported currency on either side', () => {
      for (const args of [
        [500, 'JPY', 'EGP'],
        [500, 'USD', 'XYZ'],
      ] as const) {
        try {
          convertMinorUnits(args[0], args[1], args[2], RATE_48_75);
          throw new Error('expected throw');
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.UNSUPPORTED_CURRENCY);
        }
      }
    });

    it('rejects a negative amount', () => {
      try {
        convertMinorUnits(-500, 'USD', 'EGP', RATE_48_75);
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.NEGATIVE_AMOUNT);
      }
    });

    it('rejects a non-positive rate', () => {
      for (const rate of [0, -1, 1.5]) {
        try {
          convertMinorUnits(500, 'USD', 'EGP', rate);
          throw new Error('expected throw');
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_SCALE);
        }
      }
    });

    it('rejects an overflowing conversion rather than losing precision', () => {
      try {
        convertMinorUnits(Number.MAX_SAFE_INTEGER - 1, 'USD', 'EGP', RATE_48_75);
        throw new Error('expected throw');
      } catch (error) {
        expect((error as MoneyError).code).toBe(MoneyErrorCode.AMOUNT_OVERFLOW);
      }
    });

    it('is monotonic: a larger base amount never converts to a smaller total', () => {
      let previous = -1;
      for (let minor = 0; minor <= 20_000; minor += 137) {
        const converted = convertMinorUnits(minor, 'USD', 'EGP', RATE_48_75);
        expect(converted).toBeGreaterThanOrEqual(previous);
        previous = converted;
      }
    });
  });

  describe('isFxQuoteExpired', () => {
    it('treats a quote as live before its expiry', () => {
      expect(isFxQuoteExpired(1000, 999)).toBe(false);
    });

    it('treats a quote as expired at and after its expiry instant', () => {
      expect(isFxQuoteExpired(1000, 1000)).toBe(true);
      expect(isFxQuoteExpired(1000, 1001)).toBe(true);
    });
  });
});
