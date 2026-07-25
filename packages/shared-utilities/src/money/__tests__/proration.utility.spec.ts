import { PRORATION_RATIO_SCALE } from '@claw/shared-constants';

import { MoneyError } from '../money-error';
import { MoneyErrorCode } from '../money-error-code.enum';
import {
  calculateProration,
  calculateRemainingRatioScaled,
  isZeroValueChange,
  monthlyEquivalentMinor,
} from '../proration.utility';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_START = Date.UTC(2026, 6, 1);
const PERIOD_END = PERIOD_START + 30 * DAY_MS;

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_00_00_00_00;
  };
}

describe('proration.utility', () => {
  describe('calculateRemainingRatioScaled', () => {
    it('returns the full scale at the exact period start', () => {
      expect(calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, PERIOD_START)).toBe(
        PRORATION_RATIO_SCALE,
      );
    });

    it('returns zero at the exact period end', () => {
      expect(calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, PERIOD_END)).toBe(0);
    });

    it('returns 29/30 one day in', () => {
      const ratio = calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, PERIOD_START + DAY_MS);
      expect(ratio).toBe(Math.round((29 / 30) * PRORATION_RATIO_SCALE));
    });

    it('returns half at the midpoint', () => {
      const midpoint = PERIOD_START + 15 * DAY_MS;
      expect(calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, midpoint)).toBe(
        PRORATION_RATIO_SCALE / 2,
      );
    });

    it('clamps to the full scale before the period starts', () => {
      // A clock skew must not credit more than the customer actually paid.
      expect(calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, PERIOD_START - DAY_MS)).toBe(
        PRORATION_RATIO_SCALE,
      );
    });

    it('clamps to zero after the period ends', () => {
      expect(calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, PERIOD_END + DAY_MS)).toBe(0);
    });

    it('rejects a zero-length or inverted period', () => {
      for (const end of [PERIOD_START, PERIOD_START - DAY_MS]) {
        try {
          calculateRemainingRatioScaled(PERIOD_START, end, PERIOD_START);
          throw new Error('expected throw');
        } catch (error) {
          expect((error as MoneyError).code).toBe(MoneyErrorCode.INVALID_PERIOD);
        }
      }
    });

    it('rejects a non-finite bound', () => {
      expect(() => calculateRemainingRatioScaled(Number.NaN, PERIOD_END, PERIOD_START)).toThrow(
        MoneyError,
      );
    });

    it('always lands within [0, SCALE] for any sampled instant', () => {
      const rng = createRng(31_337);
      for (let index = 0; index < 500; index += 1) {
        const effectiveAt = PERIOD_START + Math.floor(rng() * 60 * DAY_MS) - 15 * DAY_MS;
        const ratio = calculateRemainingRatioScaled(PERIOD_START, PERIOD_END, effectiveAt);
        expect(ratio).toBeGreaterThanOrEqual(0);
        expect(ratio).toBeLessThanOrEqual(PRORATION_RATIO_SCALE);
        expect(Number.isInteger(ratio)).toBe(true);
      }
    });
  });

  describe('calculateProration', () => {
    it('matches the specification worked example: $20 -> $30 after one day', () => {
      const result = calculateProration({
        currentPeriodPriceMinor: 2000,
        targetPeriodPriceMinor: 3000,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        effectiveAtMs: PERIOD_START + DAY_MS,
      });

      // (3000 - 2000) * 29/30 = 966.67 -> 967 minor units = $9.67
      expect(result.amountDueMinor).toBe(967);
      expect(result.unusedCurrentCreditMinor).toBe(1933);
      expect(result.targetRemainingChargeMinor).toBe(2900);
    });

    it('charges the full difference at the very start of a period', () => {
      const result = calculateProration({
        currentPeriodPriceMinor: 2000,
        targetPeriodPriceMinor: 3000,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        effectiveAtMs: PERIOD_START,
      });
      expect(result.amountDueMinor).toBe(1000);
    });

    it('charges nothing at the very end of a period', () => {
      const result = calculateProration({
        currentPeriodPriceMinor: 2000,
        targetPeriodPriceMinor: 3000,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        effectiveAtMs: PERIOD_END,
      });
      expect(result.amountDueMinor).toBe(0);
      expect(isZeroValueChange(result)).toBe(true);
    });

    it('never bills a negative amount on a downgrade', () => {
      const result = calculateProration({
        currentPeriodPriceMinor: 5000,
        targetPeriodPriceMinor: 500,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        effectiveAtMs: PERIOD_START + 10 * DAY_MS,
      });
      expect(result.amountDueMinor).toBe(0);
      expect(result.unusedCurrentCreditMinor).toBeGreaterThan(result.targetRemainingChargeMinor);
    });

    it('charges nothing for a same-price change', () => {
      const result = calculateProration({
        currentPeriodPriceMinor: 2000,
        targetPeriodPriceMinor: 2000,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        effectiveAtMs: PERIOD_START + 7 * DAY_MS,
      });
      expect(result.amountDueMinor).toBe(0);
    });

    it('handles an upgrade from the free plan', () => {
      const result = calculateProration({
        currentPeriodPriceMinor: 0,
        targetPeriodPriceMinor: 2000,
        periodStartMs: PERIOD_START,
        periodEndMs: PERIOD_END,
        effectiveAtMs: PERIOD_START + 15 * DAY_MS,
      });
      expect(result.unusedCurrentCreditMinor).toBe(0);
      expect(result.amountDueMinor).toBe(1000);
    });

    it('prorates a yearly plan without overflow', () => {
      const yearEnd = PERIOD_START + 365 * DAY_MS;
      const result = calculateProration({
        currentPeriodPriceMinor: 20_000,
        targetPeriodPriceMinor: 200_000,
        periodStartMs: PERIOD_START,
        periodEndMs: yearEnd,
        effectiveAtMs: PERIOD_START + 100 * DAY_MS,
      });
      expect(result.amountDueMinor).toBeGreaterThan(0);
      expect(Number.isSafeInteger(result.amountDueMinor)).toBe(true);
    });

    it('rejects a negative price', () => {
      expect(() =>
        calculateProration({
          currentPeriodPriceMinor: -1,
          targetPeriodPriceMinor: 3000,
          periodStartMs: PERIOD_START,
          periodEndMs: PERIOD_END,
          effectiveAtMs: PERIOD_START,
        }),
      ).toThrow(MoneyError);
    });

    it('holds its invariants across sampled inputs', () => {
      const rng = createRng(2026);
      for (let index = 0; index < 500; index += 1) {
        const currentPrice = Math.floor(rng() * 200_000);
        const targetPrice = Math.floor(rng() * 200_000);
        const effectiveAt = PERIOD_START + Math.floor(rng() * 30 * DAY_MS);
        const result = calculateProration({
          currentPeriodPriceMinor: currentPrice,
          targetPeriodPriceMinor: targetPrice,
          periodStartMs: PERIOD_START,
          periodEndMs: PERIOD_END,
          effectiveAtMs: effectiveAt,
        });

        // Never negative, always integral.
        expect(result.amountDueMinor).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result.amountDueMinor)).toBe(true);
        // Never more than the target's own remaining charge.
        expect(result.amountDueMinor).toBeLessThanOrEqual(result.targetRemainingChargeMinor);
        // Credit can never exceed what was paid for the period.
        expect(result.unusedCurrentCreditMinor).toBeLessThanOrEqual(currentPrice);
        // A downgrade never produces an amount due.
        if (targetPrice <= currentPrice) {
          expect(result.amountDueMinor).toBe(0);
        }
      }
    });
  });

  describe('monthlyEquivalentMinor', () => {
    it('divides a yearly price into twelve', () => {
      expect(monthlyEquivalentMinor(120_000)).toBe(10_000);
    });

    it('rounds half up on an inexact division', () => {
      expect(monthlyEquivalentMinor(100)).toBe(8);
    });

    it('rejects a negative yearly price', () => {
      expect(() => monthlyEquivalentMinor(-1)).toThrow(MoneyError);
    });
  });
});
