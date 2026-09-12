import { DisplayRoundingPolicy } from '@claw/shared-types';

import {
  applyCommercialRounding,
  applyDisplayRoundingPolicy,
  commercialIncrementMinor,
  isBelowSmallestDisplayUnit,
} from '../commercial-rounding.utility';

describe('commercial-rounding.utility', () => {
  describe('the increment ladder', () => {
    it('leaves small amounts at full precision', () => {
      expect(commercialIncrementMinor(847, 'EUR')).toBe(1);
      expect(commercialIncrementMinor(999, 'USD')).toBe(1);
    });

    it('climbs with magnitude, not with currency', () => {
      expect(commercialIncrementMinor(5_000, 'EGP')).toBe(100);
      expect(commercialIncrementMinor(51_283, 'EGP')).toBe(500);
      expect(commercialIncrementMinor(500_000, 'EGP')).toBe(1_000);
      expect(commercialIncrementMinor(5_000_000, 'EGP')).toBe(5_000);
    });

    it('never proposes a sub-unit increment for a zero-decimal currency', () => {
      // JPY 0.01 does not exist. The floor is one whole yen.
      expect(commercialIncrementMinor(5, 'JPY')).toBe(1);
      expect(commercialIncrementMinor(1_470, 'JPY')).toBe(10);
    });
  });

  describe('applyCommercialRounding', () => {
    it('turns a calculator number into a price', () => {
      // USD 10 at 51.283 EGP/USD is EGP 512.83, which reads like arithmetic.
      expect(applyCommercialRounding(51_283, 'EGP')).toBe(51_500);
    });

    it('leaves a free plan at zero', () => {
      // The one case where rounding would invent money out of nothing.
      expect(applyCommercialRounding(0, 'EGP')).toBe(0);
      expect(applyCommercialRounding(0, 'JPY')).toBe(0);
    });

    it('never collapses a real amount to nothing', () => {
      expect(applyCommercialRounding(1, 'EGP')).toBe(1);
      expect(applyCommercialRounding(1, 'JPY')).toBeGreaterThan(0);
      expect(applyCommercialRounding(-1, 'EGP')).toBe(-1);
    });

    it('rounds to the nearest increment, not always upward', () => {
      // No FX buffer. A display-only figure that leans high is just a price
      // quietly inflated for everyone outside the United States.
      expect(applyCommercialRounding(51_100, 'EGP')).toBe(51_000);
      expect(applyCommercialRounding(51_400, 'EGP')).toBe(51_500);
    });

    it('rounds an exact midpoint half up', () => {
      expect(applyCommercialRounding(51_250, 'EGP')).toBe(51_500);
    });

    it('rounds a refund by the same magnitude as the charge', () => {
      expect(applyCommercialRounding(-51_283, 'EGP')).toBe(-applyCommercialRounding(51_283, 'EGP'));
    });

    it('preserves two decimals on a low-nominal currency', () => {
      // EUR 8.47 is already a natural-looking price.
      expect(applyCommercialRounding(847, 'EUR')).toBe(847);
      expect(applyCommercialRounding(1_000, 'USD')).toBe(1_000);
    });

    it('rounds a yen amount to whole yen steps', () => {
      expect(applyCommercialRounding(1_470, 'JPY')).toBe(1_470);
      expect(applyCommercialRounding(1_473, 'JPY')).toBe(1_470);
      expect(applyCommercialRounding(1_476, 'JPY')).toBe(1_480);
    });

    it('rounds a very weak currency at its own scale', () => {
      // VND 260,000 for a ten-dollar plan.
      expect(applyCommercialRounding(261_437, 'VND')).toBe(261_400);
    });

    it('is deterministic', () => {
      const once = applyCommercialRounding(51_283, 'EGP');
      const twice = applyCommercialRounding(51_283, 'EGP');
      expect(once).toBe(twice);
    });

    it('rejects a non-integer amount', () => {
      expect(() => applyCommercialRounding(512.83, 'EGP')).toThrow();
    });
  });

  describe('the two policies', () => {
    it('leaves a usage amount exactly as converted', () => {
      // A ledger is an account of what someone consumed. Prettifying it is the
      // one place where a rounder number is a worse number.
      expect(applyDisplayRoundingPolicy(51_283, 'EGP', DisplayRoundingPolicy.PRECISE_USAGE)).toBe(
        51_283,
      );
    });

    it('rounds a plan price', () => {
      expect(
        applyDisplayRoundingPolicy(51_283, 'EGP', DisplayRoundingPolicy.COMMERCIAL_PRICE),
      ).toBe(51_500);
    });

    it('flags an amount too small to show', () => {
      // A user who spent something must not be told they spent nothing.
      expect(isBelowSmallestDisplayUnit(4, 0)).toBe(true);
      expect(isBelowSmallestDisplayUnit(0, 0)).toBe(false);
      expect(isBelowSmallestDisplayUnit(4, 1)).toBe(false);
    });
  });
});
