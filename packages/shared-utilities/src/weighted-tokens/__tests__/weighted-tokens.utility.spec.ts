import { ModelCostClass, type ModelCostRates, type RawTokenBreakdown } from '@claw/shared-types';

import { MoneyError } from '../../money/money-error';
import {
  calculateCostMicroUsd,
  calculateWeightedTokens,
  costMicroUsdToWeightedTokens,
  estimateWeightedTokens,
  hasUsablePricing,
} from '../weighted-tokens.utility';

// A mid-tier cloud model: $3/M input, $15/M output, $0.30/M cached input.
const STANDARD_RATES: ModelCostRates = {
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4',
  version: 1,
  currency: 'USD',
  inputPerMillionMicroUsd: 3_000_000,
  outputPerMillionMicroUsd: 15_000_000,
  cachedInputPerMillionMicroUsd: 300_000,
  cacheWritePerMillionMicroUsd: 3_750_000,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: 1000,
  searchCallPerUnitMicroUsd: 10_000,
  costClass: ModelCostClass.STANDARD,
  isAdminOverride: false,
  effectiveFrom: '2026-07-01T00:00:00.000Z',
  lastVerifiedAt: '2026-07-20T00:00:00.000Z',
  source: 'provider-docs',
};

const ZERO_USAGE: RawTokenBreakdown = {
  inputTokens: 0,
  cachedInputTokens: 0,
  reasoningTokens: 0,
  outputTokens: 0,
  toolCalls: 0,
  searchCalls: 0,
  imageUnits: 0,
};

function usage(overrides: Partial<RawTokenBreakdown>): RawTokenBreakdown {
  return { ...ZERO_USAGE, ...overrides };
}

describe('weighted-tokens.utility', () => {
  describe('calculateCostMicroUsd', () => {
    it('costs input tokens at the per-million rate', () => {
      // 1000 tokens * $3/M = $0.003 = 3000 micro-USD
      expect(calculateCostMicroUsd(usage({ inputTokens: 1000 }), STANDARD_RATES)).toBe(3000);
    });

    it('costs output tokens at their own, higher rate', () => {
      expect(calculateCostMicroUsd(usage({ outputTokens: 1000 }), STANDARD_RATES)).toBe(15_000);
    });

    it('costs cached input at the cheaper cached rate', () => {
      expect(calculateCostMicroUsd(usage({ cachedInputTokens: 10_000 }), STANDARD_RATES)).toBe(
        3000,
      );
    });

    it('sums every modality of one realistic request', () => {
      const cost = calculateCostMicroUsd(
        usage({ inputTokens: 12_000, cachedInputTokens: 8000, outputTokens: 2000, toolCalls: 3 }),
        STANDARD_RATES,
      );
      // 36000 + 2400 + 30000 + 3000
      expect(cost).toBe(71_400);
    });

    it('costs nothing for an empty request', () => {
      expect(calculateCostMicroUsd(ZERO_USAGE, STANDARD_RATES)).toBe(0);
    });

    it('rounds each modality up, so a quota is never under-charged', () => {
      // 1 token at $3/M is 3 micro-USD exactly; 1 token at $0.30/M is 0.3,
      // which must become 1 rather than 0.
      expect(calculateCostMicroUsd(usage({ cachedInputTokens: 1 }), STANDARD_RATES)).toBe(1);
    });

    it('falls back to the input rate when no cached rate is published', () => {
      // "We don't know" must never round down to free on a limited plan.
      const noCachedRate: ModelCostRates = {
        ...STANDARD_RATES,
        cachedInputPerMillionMicroUsd: null,
      };
      expect(calculateCostMicroUsd(usage({ cachedInputTokens: 1000 }), noCachedRate)).toBe(3000);
    });

    it('falls back to the output rate for reasoning tokens', () => {
      expect(calculateCostMicroUsd(usage({ reasoningTokens: 1000 }), STANDARD_RATES)).toBe(15_000);
    });

    it('uses a dedicated reasoning rate when one exists', () => {
      const withReasoning: ModelCostRates = {
        ...STANDARD_RATES,
        reasoningPerMillionMicroUsd: 60_000_000,
      };
      expect(calculateCostMicroUsd(usage({ reasoningTokens: 1000 }), withReasoning)).toBe(60_000);
    });

    it('treats a null rate as contributing zero rather than throwing', () => {
      const localRates: ModelCostRates = {
        ...STANDARD_RATES,
        inputPerMillionMicroUsd: null,
        outputPerMillionMicroUsd: null,
        cachedInputPerMillionMicroUsd: null,
        reasoningPerMillionMicroUsd: null,
        toolCallPerUnitMicroUsd: null,
        searchCallPerUnitMicroUsd: null,
        costClass: ModelCostClass.FREE,
      };
      expect(
        calculateCostMicroUsd(usage({ inputTokens: 5000, outputTokens: 5000 }), localRates),
      ).toBe(0);
    });

    it('costs tool and search calls per unit, not per million', () => {
      expect(calculateCostMicroUsd(usage({ toolCalls: 5, searchCalls: 2 }), STANDARD_RATES)).toBe(
        25_000,
      );
    });

    it('rejects a fractional token count', () => {
      expect(() => calculateCostMicroUsd(usage({ inputTokens: 1.5 }), STANDARD_RATES)).toThrow(
        MoneyError,
      );
    });

    it('rejects an overflowing token count', () => {
      expect(() =>
        calculateCostMicroUsd(usage({ inputTokens: Number.MAX_SAFE_INTEGER }), STANDARD_RATES),
      ).toThrow(MoneyError);
    });

    it('is monotonic in token count', () => {
      let previous = -1;
      for (let tokens = 0; tokens <= 100_000; tokens += 3571) {
        const cost = calculateCostMicroUsd(usage({ inputTokens: tokens }), STANDARD_RATES);
        expect(cost).toBeGreaterThanOrEqual(previous);
        previous = cost;
      }
    });
  });

  describe('costMicroUsdToWeightedTokens', () => {
    it('maps $1.00 of cost to 1,000,000 weighted tokens', () => {
      expect(costMicroUsdToWeightedTokens(1_000_000)).toBe(1_000_000);
    });

    it('maps one micro-USD to one weighted token', () => {
      expect(costMicroUsdToWeightedTokens(1)).toBe(1);
    });

    it('maps zero cost to zero weighted tokens', () => {
      expect(costMicroUsdToWeightedTokens(0)).toBe(0);
    });

    it('rounds a fractional cost up', () => {
      expect(costMicroUsdToWeightedTokens(0.2)).toBe(1);
    });

    it('rejects a negative cost', () => {
      expect(() => costMicroUsdToWeightedTokens(-1)).toThrow(MoneyError);
    });
  });

  describe('calculateWeightedTokens', () => {
    it('charges the Free tier its whole daily allowance for ~$0.005 of cost', () => {
      // Free is 5000 weighted tokens/day == $0.005 of provider cost.
      const weighted = calculateWeightedTokens(
        usage({ inputTokens: 1000, outputTokens: 133 }),
        STANDARD_RATES,
      );
      expect(weighted).toBe(4995);
      expect(weighted).toBeLessThanOrEqual(5000);
    });

    it('shows why raw tokens are not a fair unit', () => {
      // The same 1000 tokens cost 5x more as output than as input, so a raw
      // token counter would let an expensive request through unnoticed.
      const asInput = calculateWeightedTokens(usage({ inputTokens: 1000 }), STANDARD_RATES);
      const asOutput = calculateWeightedTokens(usage({ outputTokens: 1000 }), STANDARD_RATES);
      expect(asOutput).toBe(asInput * 5);
    });

    it('charges nothing for a genuinely free local model', () => {
      const freeRates: ModelCostRates = {
        ...STANDARD_RATES,
        provider: 'OLLAMA',
        model: 'gemma3:4b',
        inputPerMillionMicroUsd: 0,
        outputPerMillionMicroUsd: 0,
        cachedInputPerMillionMicroUsd: 0,
        toolCallPerUnitMicroUsd: 0,
        searchCallPerUnitMicroUsd: 0,
        costClass: ModelCostClass.FREE,
      };
      expect(
        calculateWeightedTokens(usage({ inputTokens: 50_000, outputTokens: 50_000 }), freeRates),
      ).toBe(0);
    });
  });

  describe('estimateWeightedTokens', () => {
    it('reserves against the maximum output, not a likely value', () => {
      // 2000 in * $3/M = 6000, 4000 out * $15/M = 60000 -> 66000
      expect(estimateWeightedTokens(2000, 4000, STANDARD_RATES)).toBe(66_000);
    });

    it('never estimates below the actual cost of the same usage', () => {
      const estimate = estimateWeightedTokens(2000, 4000, STANDARD_RATES);
      const actual = calculateWeightedTokens(
        usage({ inputTokens: 2000, outputTokens: 4000 }),
        STANDARD_RATES,
      );
      expect(estimate).toBeGreaterThanOrEqual(actual);
    });

    it('estimates zero for an empty request', () => {
      expect(estimateWeightedTokens(0, 0, STANDARD_RATES)).toBe(0);
    });
  });

  describe('hasUsablePricing', () => {
    it('accepts rates with both input and output published', () => {
      expect(hasUsablePricing(STANDARD_RATES)).toBe(true);
    });

    it('rejects rates missing either side', () => {
      expect(hasUsablePricing({ ...STANDARD_RATES, inputPerMillionMicroUsd: null })).toBe(false);
      expect(hasUsablePricing({ ...STANDARD_RATES, outputPerMillionMicroUsd: null })).toBe(false);
    });

    it('treats an explicit zero as usable, unlike an unknown null', () => {
      // A local model priced at zero is known-free; a null rate is unknown and
      // must be treated as unsafe for a limited plan.
      expect(
        hasUsablePricing({
          ...STANDARD_RATES,
          inputPerMillionMicroUsd: 0,
          outputPerMillionMicroUsd: 0,
        }),
      ).toBe(true);
    });
  });
});
