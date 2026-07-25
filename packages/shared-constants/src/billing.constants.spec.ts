import {
  BASIS_POINTS_DENOMINATOR,
  BILLING_BASE_CURRENCY,
  BILLING_EVENT_SCHEMA_VERSION,
  CHECKOUT_SESSION_TTL_MS,
  DEFAULT_GRACE_PERIOD_MS,
  FX_RATE_SCALE,
  MICRO_USD_PER_USD,
  PLAN_SLUG_FREE,
  PLAN_SLUG_PRO,
  PLAN_SLUG_TEAM,
  PRORATION_QUOTE_TTL_MS,
  PRORATION_RATIO_SCALE,
  PUBLIC_PLAN_SLUGS,
  SUPPORTED_BILLING_CURRENCIES,
  TOKENS_PER_PRICING_UNIT,
  WEBHOOK_REPLAY_TOLERANCE_MS,
  WEIGHTED_TOKENS_PER_USD,
} from './billing.constants';

describe('billing.constants', () => {
  describe('weighted-token normalization', () => {
    it('defines 1 weighted token as exactly 1 micro-USD', () => {
      // This identity is what lets weightedTokens = ceil(costMicroUsd). If the
      // two ever diverge, every quota in the system silently rescales.
      expect(WEIGHTED_TOKENS_PER_USD).toBe(MICRO_USD_PER_USD);
    });

    it('prices per million tokens', () => {
      expect(TOKENS_PER_PRICING_UNIT).toBe(1_000_000);
    });
  });

  describe('fixed-point scales', () => {
    it('uses integral scales so no float enters a billing calculation', () => {
      for (const scale of [FX_RATE_SCALE, PRORATION_RATIO_SCALE, BASIS_POINTS_DENOMINATOR]) {
        expect(Number.isInteger(scale)).toBe(true);
        expect(scale).toBeGreaterThan(0);
      }
    });

    it('keeps a full-precision proration ratio inside safe integer range', () => {
      // Worst case: a yearly plan priced at $2000 (200_000 minor) multiplied by
      // a full-scale ratio must not approach Number.MAX_SAFE_INTEGER.
      expect(200_000 * PRORATION_RATIO_SCALE).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    it('expresses basis points against 10000', () => {
      expect(BASIS_POINTS_DENOMINATOR).toBe(10_000);
    });
  });

  describe('currency', () => {
    it('anchors plan pricing to USD', () => {
      expect(BILLING_BASE_CURRENCY).toBe('USD');
      expect(SUPPORTED_BILLING_CURRENCIES[BILLING_BASE_CURRENCY]).toBe(2);
    });

    it('declares an explicit minor-unit exponent for every supported currency', () => {
      for (const [code, exponent] of Object.entries(SUPPORTED_BILLING_CURRENCIES)) {
        expect(code).toMatch(/^[A-Z]{3}$/);
        expect(Number.isInteger(exponent)).toBe(true);
        expect(exponent).toBeGreaterThanOrEqual(0);
      }
    });

    it('is frozen so a caller cannot register a currency at runtime', () => {
      expect(Object.isFrozen(SUPPORTED_BILLING_CURRENCIES)).toBe(true);
    });
  });

  describe('plan catalog', () => {
    it('publishes exactly seven plans', () => {
      expect(PUBLIC_PLAN_SLUGS).toHaveLength(7);
      expect(new Set(PUBLIC_PLAN_SLUGS).size).toBe(7);
    });

    it('preserves the three pre-billing slugs', () => {
      // free/pro/team predate billing; renaming them would orphan existing
      // UserPlanAssignment rows.
      for (const slug of [PLAN_SLUG_FREE, PLAN_SLUG_PRO, PLAN_SLUG_TEAM]) {
        expect(PUBLIC_PLAN_SLUGS).toContain(slug);
      }
    });

    it('uses lowercase kebab slugs only', () => {
      for (const slug of PUBLIC_PLAN_SLUGS) {
        expect(slug).toMatch(/^[a-z][\da-z-]*$/);
      }
    });

    it('is frozen', () => {
      expect(Object.isFrozen(PUBLIC_PLAN_SLUGS)).toBe(true);
    });
  });

  describe('operational bounds', () => {
    it('expires a proration quote before the checkout session it feeds', () => {
      // A quote must never outlive the session that consumes it, or a user could
      // hold a stale favourable price open across a price change.
      expect(PRORATION_QUOTE_TTL_MS).toBeLessThan(CHECKOUT_SESSION_TTL_MS);
    });

    it('bounds the webhook replay window tightly', () => {
      expect(WEBHOOK_REPLAY_TOLERANCE_MS).toBeGreaterThan(0);
      expect(WEBHOOK_REPLAY_TOLERANCE_MS).toBeLessThanOrEqual(15 * 60 * 1000);
    });

    it('gives a past-due subscription a multi-day grace period', () => {
      expect(DEFAULT_GRACE_PERIOD_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    });
  });

  it('starts the event schema at version 1', () => {
    expect(BILLING_EVENT_SCHEMA_VERSION).toBe(1);
  });
});
