import { PRORATION_CALCULATOR_VERSION, PRORATION_RATIO_SCALE } from '@claw/shared-constants';
import { ProrationLineItemType, ProrationMode } from '@claw/shared-types';

import { MoneyError } from '../money-error';
import { calculateProrationBreakdown } from '../proration.utility';

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

function breakdown(
  mode: ProrationMode,
  currentPeriodPriceMinor: number,
  targetPeriodPriceMinor: number,
  effectiveAtMs: number,
  periodEndMs: number = PERIOD_END,
): ReturnType<typeof calculateProrationBreakdown> {
  return calculateProrationBreakdown({
    mode,
    currentPeriodPriceMinor,
    targetPeriodPriceMinor,
    periodStartMs: PERIOD_START,
    periodEndMs,
    effectiveAtMs,
  });
}

describe('calculateProrationBreakdown', () => {
  describe('RESET_CYCLE_WITH_UNUSED_CREDIT — the canonical program requirement', () => {
    // The requirement this whole program exists for. $5 -> $10 ten days into a
    // thirty-day period must charge 667 minor units, not 334, and must start a
    // fresh period. Locked here so it cannot regress silently.
    it('charges 667 for $5 -> $10 after 10 of 30 days', () => {
      const result = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        500,
        1000,
        PERIOD_START + 10 * DAY_MS,
      );

      expect(result.usedCurrentValueMinor).toBe(167);
      expect(result.unusedCurrentCreditMinor).toBe(333);
      expect(result.targetChargeBaseMinor).toBe(1000);
      expect(result.creditAppliedMinor).toBe(333);
      expect(result.creditSurplusMinor).toBe(0);
      expect(result.amountDueMinor).toBe(667);
      expect(result.resetsBillingCycle).toBe(true);
      expect(result.calculatorVersion).toBe(PRORATION_CALCULATOR_VERSION);
    });

    it('itemizes that charge as a full target period less the unused credit', () => {
      const result = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        500,
        1000,
        PERIOD_START + 10 * DAY_MS,
      );

      expect(result.lineItems).toEqual([
        { type: ProrationLineItemType.TARGET_PLAN_FULL_PERIOD, amountMinor: 1000 },
        { type: ProrationLineItemType.UNUSED_PLAN_CREDIT, amountMinor: -333 },
      ]);
    });

    it('credits the whole current price when upgrading at the period start', () => {
      const result = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        500,
        1000,
        PERIOD_START,
      );
      expect(result.unusedCurrentCreditMinor).toBe(500);
      expect(result.amountDueMinor).toBe(500);
    });

    it('credits nothing when upgrading at the period end', () => {
      const result = breakdown(ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT, 500, 1000, PERIOD_END);
      expect(result.unusedCurrentCreditMinor).toBe(0);
      expect(result.amountDueMinor).toBe(1000);
    });

    it('carries surplus credit forward instead of creating cash', () => {
      // Pack example 4: 1200 of eligible credit against a 1000 target.
      const result = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        1200,
        1000,
        PERIOD_START,
      );
      expect(result.creditAppliedMinor).toBe(1000);
      expect(result.creditSurplusMinor).toBe(200);
      expect(result.amountDueMinor).toBe(0);
    });
  });

  describe('KEEP_CYCLE_PRORATE_DIFFERENCE — the pre-v2 behaviour, preserved', () => {
    it('charges 334 for the same $5 -> $10 change', () => {
      const result = breakdown(
        ProrationMode.KEEP_CYCLE_PRORATE_DIFFERENCE,
        500,
        1000,
        PERIOD_START + 10 * DAY_MS,
      );

      expect(result.targetChargeBaseMinor).toBe(667);
      expect(result.unusedCurrentCreditMinor).toBe(333);
      expect(result.amountDueMinor).toBe(334);
      expect(result.resetsBillingCycle).toBe(false);
    });

    it('reproduces the shipped $20 -> $30 after one day example', () => {
      const result = breakdown(
        ProrationMode.KEEP_CYCLE_PRORATE_DIFFERENCE,
        2000,
        3000,
        PERIOD_START + DAY_MS,
      );
      expect(result.amountDueMinor).toBe(967);
      expect(result.unusedCurrentCreditMinor).toBe(1933);
      expect(result.targetChargeBaseMinor).toBe(2900);
    });

    it('itemizes against the remaining period, not a full one', () => {
      const result = breakdown(
        ProrationMode.KEEP_CYCLE_PRORATE_DIFFERENCE,
        500,
        1000,
        PERIOD_START + 10 * DAY_MS,
      );
      expect(result.lineItems[0]?.type).toBe(ProrationLineItemType.TARGET_PLAN_REMAINING_PERIOD);
    });
  });

  describe('the two modes disagree only where they should', () => {
    it('agree at the period start, where a reset cycle costs the same', () => {
      const reset = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        500,
        1000,
        PERIOD_START,
      );
      const keep = breakdown(ProrationMode.KEEP_CYCLE_PRORATE_DIFFERENCE, 500, 1000, PERIOD_START);
      expect(reset.amountDueMinor).toBe(keep.amountDueMinor);
    });

    it('diverge most at the period end', () => {
      const reset = breakdown(ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT, 500, 1000, PERIOD_END);
      const keep = breakdown(ProrationMode.KEEP_CYCLE_PRORATE_DIFFERENCE, 500, 1000, PERIOD_END);
      expect(reset.amountDueMinor).toBe(1000);
      expect(keep.amountDueMinor).toBe(0);
    });
  });

  describe('month lengths and leap years', () => {
    const cases: readonly { label: string; days: number }[] = [
      { label: 'February in a common year', days: 28 },
      { label: 'February in a leap year', days: 29 },
      { label: 'April', days: 30 },
      { label: 'July', days: 31 },
    ];

    for (const { label, days } of cases) {
      it(`prorates a ${label} period without assuming 30 days`, () => {
        const end = PERIOD_START + days * DAY_MS;
        const halfway = PERIOD_START + Math.floor((days / 2) * DAY_MS);
        const result = breakdown(
          ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
          500,
          1000,
          halfway,
          end,
        );
        // Half the period elapsed => roughly half the price credited.
        expect(result.unusedCurrentCreditMinor).toBe(250);
        expect(result.amountDueMinor).toBe(750);
      });
    }

    // The calculator works from exact millisecond timestamps, but the credit it
    // produces is quantised twice: by PRORATION_RATIO_SCALE (1e6) and again by
    // the minor unit. On a 31-day period one scale step is ~2.7 seconds, so a
    // sub-second difference is genuinely invisible — and must be, or two nodes
    // whose clocks differ by a millisecond would quote different prices.
    it('resolves sub-minute differences in effective time', () => {
      const end = PERIOD_START + 31 * DAY_MS;
      const atStart = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        100_000,
        200_000,
        PERIOD_START,
        end,
      );
      const aMinuteLater = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        100_000,
        200_000,
        PERIOD_START + 60_000,
        end,
      );
      expect(aMinuteLater.remainingRatioScaled).toBeLessThan(atStart.remainingRatioScaled);
      expect(aMinuteLater.unusedCurrentCreditMinor).toBeLessThan(atStart.unusedCurrentCreditMinor);
    });

    it('quotes the same price for clocks that differ by a millisecond', () => {
      const end = PERIOD_START + 31 * DAY_MS;
      const nodeA = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        100_000,
        200_000,
        PERIOD_START + 10 * DAY_MS,
        end,
      );
      const nodeB = breakdown(
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        100_000,
        200_000,
        PERIOD_START + 10 * DAY_MS + 1,
        end,
      );
      expect(nodeB.amountDueMinor).toBe(nodeA.amountDueMinor);
    });
  });

  describe('validation', () => {
    it('rejects a negative current price', () => {
      expect(() =>
        breakdown(ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT, -1, 1000, PERIOD_START),
      ).toThrow(MoneyError);
    });

    it('rejects a negative target price', () => {
      expect(() =>
        breakdown(ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT, 500, -1, PERIOD_START),
      ).toThrow(MoneyError);
    });

    it('rejects an inverted period', () => {
      expect(() =>
        breakdown(
          ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
          500,
          1000,
          PERIOD_START,
          PERIOD_START - DAY_MS,
        ),
      ).toThrow(MoneyError);
    });
  });

  describe('invariants across sampled inputs', () => {
    it('holds for every mode, price and instant sampled', () => {
      const rng = createRng(48_667);
      const modes = [
        ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
        ProrationMode.KEEP_CYCLE_PRORATE_DIFFERENCE,
      ];

      for (let index = 0; index < 1000; index += 1) {
        const mode = modes[index % modes.length] ?? ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT;
        const currentPrice = Math.floor(rng() * 200_000);
        const targetPrice = Math.floor(rng() * 200_000);
        const effectiveAt = PERIOD_START + Math.floor(rng() * 30 * DAY_MS);
        const result = breakdown(mode, currentPrice, targetPrice, effectiveAt);

        // Never negative, always integral.
        expect(result.amountDueMinor).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result.amountDueMinor)).toBe(true);
        // Used and unused together are exactly what was paid — no lost cent.
        expect(result.usedCurrentValueMinor + result.unusedCurrentCreditMinor).toBe(currentPrice);
        // Applied and surplus together are exactly the credit earned.
        expect(result.creditAppliedMinor + result.creditSurplusMinor).toBe(
          result.unusedCurrentCreditMinor,
        );
        // Credit never exceeds the price paid for the period.
        expect(result.unusedCurrentCreditMinor).toBeLessThanOrEqual(currentPrice);
        // The customer never pays more than the target charge base.
        expect(result.amountDueMinor).toBeLessThanOrEqual(result.targetChargeBaseMinor);
        // Line items reconcile to the total.
        const sum = result.lineItems.reduce((total, item) => total + item.amountMinor, 0);
        expect(sum).toBe(result.amountDueMinor);
        // Ratio stays in range.
        expect(result.remainingRatioScaled).toBeGreaterThanOrEqual(0);
        expect(result.remainingRatioScaled).toBeLessThanOrEqual(PRORATION_RATIO_SCALE);
      }
    });

    it('makes unused credit monotonically decrease as the period is consumed', () => {
      let previous = Number.POSITIVE_INFINITY;
      for (let day = 0; day <= 30; day += 1) {
        const result = breakdown(
          ProrationMode.RESET_CYCLE_WITH_UNUSED_CREDIT,
          500,
          1000,
          PERIOD_START + day * DAY_MS,
        );
        expect(result.unusedCurrentCreditMinor).toBeLessThanOrEqual(previous);
        previous = result.unusedCurrentCreditMinor;
      }
      expect(previous).toBe(0);
    });
  });
});
