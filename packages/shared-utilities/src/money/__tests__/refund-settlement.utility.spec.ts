import { DEFAULT_COOLING_OFF_HOURS, MS_PER_HOUR } from '@claw/shared-constants';
import {
  CancellationSettlementMode,
  type RefundSettlementInput,
  RefundSettlementKind,
} from '@claw/shared-types';

import { MoneyError } from '../money-error';
import {
  calculateRefundSettlement,
  calculateRemainingRefundableMinor,
  coolingOffExpiresAtMs,
  isWithinCoolingOff,
} from '../refund-settlement.utility';

const DAY_MS = 24 * 60 * 60 * 1000;
const CAPTURED_AT = Date.UTC(2026, 6, 1, 12, 0, 0);
const PERIOD_START = CAPTURED_AT;
const PERIOD_END = PERIOD_START + 30 * DAY_MS;
const WINDOW_MS = DEFAULT_COOLING_OFF_HOURS * MS_PER_HOUR;

function input(overrides: Partial<RefundSettlementInput> = {}): RefundSettlementInput {
  return {
    mode: CancellationSettlementMode.FULL_WITHIN_COOLING_OFF_THEN_UNUSED_PRORATED,
    coolingOffHours: DEFAULT_COOLING_OFF_HOURS,
    capturedAtMs: CAPTURED_AT,
    nowMs: CAPTURED_AT,
    capturedAmountMinor: 1000,
    priorRefundedMinor: 0,
    disputedMinor: 0,
    nonRefundableMinor: 0,
    periodStartMs: PERIOD_START,
    periodEndMs: PERIOD_END,
    ...overrides,
  };
}

describe('cooling-off window', () => {
  it('expires exactly 48 hours after provider-confirmed capture', () => {
    expect(coolingOffExpiresAtMs(CAPTURED_AT, DEFAULT_COOLING_OFF_HOURS)).toBe(
      CAPTURED_AT + WINDOW_MS,
    );
  });

  // REF-001 / REF-002 / REF-003: the three instants the policy turns on.
  it('is open at 47:59:59.999', () => {
    expect(
      isWithinCoolingOff(CAPTURED_AT, DEFAULT_COOLING_OFF_HOURS, CAPTURED_AT + WINDOW_MS - 1),
    ).toBe(true);
  });

  it('is open at exactly 48:00:00.000 — the boundary is inclusive', () => {
    expect(
      isWithinCoolingOff(CAPTURED_AT, DEFAULT_COOLING_OFF_HOURS, CAPTURED_AT + WINDOW_MS),
    ).toBe(true);
  });

  it('is closed one millisecond later', () => {
    expect(
      isWithinCoolingOff(CAPTURED_AT, DEFAULT_COOLING_OFF_HOURS, CAPTURED_AT + WINDOW_MS + 1),
    ).toBe(false);
  });

  it('honours a plan-configured window other than 48 hours', () => {
    expect(coolingOffExpiresAtMs(CAPTURED_AT, 14 * 24)).toBe(CAPTURED_AT + 14 * DAY_MS);
  });

  it('treats a zero-hour window as immediately closed after capture', () => {
    expect(isWithinCoolingOff(CAPTURED_AT, 0, CAPTURED_AT)).toBe(true);
    expect(isWithinCoolingOff(CAPTURED_AT, 0, CAPTURED_AT + 1)).toBe(false);
  });

  it('rejects a negative window rather than silently refunding forever', () => {
    expect(() => coolingOffExpiresAtMs(CAPTURED_AT, -1)).toThrow(MoneyError);
  });

  it('rejects a non-finite capture time', () => {
    expect(() => coolingOffExpiresAtMs(Number.NaN, DEFAULT_COOLING_OFF_HOURS)).toThrow(MoneyError);
  });
});

describe('calculateRemainingRefundableMinor', () => {
  it('subtracts prior refunds, disputes and non-refundable components', () => {
    expect(
      calculateRemainingRefundableMinor({
        capturedAmountMinor: 1000,
        priorRefundedMinor: 300,
        disputedMinor: 100,
        nonRefundableMinor: 50,
      }),
    ).toBe(550);
  });

  it('floors at zero when claims exceed the capture', () => {
    expect(
      calculateRemainingRefundableMinor({
        capturedAmountMinor: 1000,
        priorRefundedMinor: 900,
        disputedMinor: 500,
        nonRefundableMinor: 0,
      }),
    ).toBe(0);
  });

  it('rejects a negative component', () => {
    expect(() =>
      calculateRemainingRefundableMinor({
        capturedAmountMinor: 1000,
        priorRefundedMinor: -1,
        disputedMinor: 0,
        nonRefundableMinor: 0,
      }),
    ).toThrow(MoneyError);
  });
});

describe('calculateRefundSettlement', () => {
  describe('inside the cooling-off window', () => {
    it('returns the full remaining refundable balance', () => {
      const result = calculateRefundSettlement(input({ nowMs: CAPTURED_AT + DAY_MS }));
      expect(result.kind).toBe(RefundSettlementKind.FULL);
      expect(result.refundAmountMinor).toBe(1000);
      expect(result.creditAmountMinor).toBe(0);
      expect(result.withinCoolingOff).toBe(true);
    });

    it('is still full at the exact boundary', () => {
      const result = calculateRefundSettlement(input({ nowMs: CAPTURED_AT + WINDOW_MS }));
      expect(result.kind).toBe(RefundSettlementKind.FULL);
      expect(result.refundAmountMinor).toBe(1000);
    });

    // Pack example 5: a prior partial refund must not be handed back twice.
    it('never returns more than the balance left after a prior refund', () => {
      const result = calculateRefundSettlement(
        input({ nowMs: CAPTURED_AT + DAY_MS, priorRefundedMinor: 300 }),
      );
      expect(result.remainingRefundableMinor).toBe(700);
      expect(result.refundAmountMinor).toBe(700);
    });

    it('returns nothing when a dispute already reversed the whole capture', () => {
      const result = calculateRefundSettlement(
        input({ nowMs: CAPTURED_AT + DAY_MS, disputedMinor: 1000 }),
      );
      expect(result.kind).toBe(RefundSettlementKind.NONE);
      expect(result.refundAmountMinor).toBe(0);
    });

    it('excludes an explicitly non-refundable component', () => {
      const result = calculateRefundSettlement(
        input({ nowMs: CAPTURED_AT + DAY_MS, nonRefundableMinor: 200 }),
      );
      expect(result.refundAmountMinor).toBe(800);
    });
  });

  describe('after the window — FULL_WITHIN_COOLING_OFF_THEN_UNUSED_PRORATED (default)', () => {
    it('refunds only the unused prorated remainder', () => {
      // 10 of 30 days consumed => 20/30 of 1000 = 667 unused.
      const result = calculateRefundSettlement(input({ nowMs: PERIOD_START + 10 * DAY_MS }));
      expect(result.withinCoolingOff).toBe(false);
      expect(result.kind).toBe(RefundSettlementKind.UNUSED_PRORATED);
      expect(result.refundAmountMinor).toBe(667);
      expect(result.creditAmountMinor).toBe(0);
    });

    it('refunds nothing at the very end of the period', () => {
      const result = calculateRefundSettlement(input({ nowMs: PERIOD_END }));
      expect(result.kind).toBe(RefundSettlementKind.NONE);
      expect(result.refundAmountMinor).toBe(0);
    });

    it('prorates the refundable base, not the gross capture', () => {
      // 700 refundable after a 300 prior refund; halfway through => 350.
      const result = calculateRefundSettlement(
        input({ nowMs: PERIOD_START + 15 * DAY_MS, priorRefundedMinor: 300 }),
      );
      expect(result.remainingRefundableMinor).toBe(700);
      expect(result.refundAmountMinor).toBe(350);
    });
  });

  describe('after the window — other typed policies', () => {
    it('FULL_WITHIN_COOLING_OFF_THEN_NO_REFUND settles nothing', () => {
      const result = calculateRefundSettlement(
        input({
          mode: CancellationSettlementMode.FULL_WITHIN_COOLING_OFF_THEN_NO_REFUND,
          nowMs: PERIOD_START + 10 * DAY_MS,
        }),
      );
      expect(result.kind).toBe(RefundSettlementKind.NONE);
      expect(result.refundAmountMinor).toBe(0);
      expect(result.creditAmountMinor).toBe(0);
    });

    it('CREDIT_ONLY_AFTER_COOLING_OFF issues credit instead of cash', () => {
      const result = calculateRefundSettlement(
        input({
          mode: CancellationSettlementMode.CREDIT_ONLY_AFTER_COOLING_OFF,
          nowMs: PERIOD_START + 10 * DAY_MS,
        }),
      );
      expect(result.kind).toBe(RefundSettlementKind.CREDIT_ONLY);
      expect(result.refundAmountMinor).toBe(0);
      expect(result.creditAmountMinor).toBe(667);
    });

    it('FULL_ALWAYS refunds everything even long after the window', () => {
      const result = calculateRefundSettlement(
        input({
          mode: CancellationSettlementMode.FULL_ALWAYS,
          nowMs: PERIOD_START + 29 * DAY_MS,
        }),
      );
      expect(result.kind).toBe(RefundSettlementKind.FULL);
      expect(result.refundAmountMinor).toBe(1000);
    });

    it('fails closed on an unrecognised policy rather than paying out', () => {
      expect(() =>
        calculateRefundSettlement(
          input({
            mode: 'NOT_A_REAL_POLICY' as CancellationSettlementMode,
            nowMs: PERIOD_START + 10 * DAY_MS,
          }),
        ),
      ).toThrow(MoneyError);
    });
  });

  describe('invariants', () => {
    it('never settles more than the remaining refundable balance', () => {
      const modes = Object.values(CancellationSettlementMode);
      for (const mode of modes) {
        for (let day = 0; day <= 30; day += 1) {
          const result = calculateRefundSettlement(
            input({ mode, nowMs: PERIOD_START + day * DAY_MS, priorRefundedMinor: 137 }),
          );
          const settled = result.refundAmountMinor + result.creditAmountMinor;
          expect(settled).toBeGreaterThanOrEqual(0);
          expect(settled).toBeLessThanOrEqual(result.remainingRefundableMinor);
          expect(Number.isInteger(settled)).toBe(true);
        }
      }
    });

    it('never both refunds cash and issues credit for the same settlement', () => {
      for (const mode of Object.values(CancellationSettlementMode)) {
        const result = calculateRefundSettlement(
          input({ mode, nowMs: PERIOD_START + 10 * DAY_MS }),
        );
        expect(result.refundAmountMinor === 0 || result.creditAmountMinor === 0).toBe(true);
      }
    });

    it('handles a zero-length period without dividing by zero', () => {
      const result = calculateRefundSettlement(
        input({ nowMs: CAPTURED_AT + WINDOW_MS + 1, periodEndMs: PERIOD_START }),
      );
      expect(result.remainingRatioScaled).toBe(0);
      expect(result.kind).toBe(RefundSettlementKind.NONE);
    });
  });
});
