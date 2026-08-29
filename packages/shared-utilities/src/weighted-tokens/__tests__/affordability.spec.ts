import { ModelCostClass, type ModelCostRates, TokenUsageSource } from '@claw/shared-types';

import {
  calculateCostMicroUsd,
  hasUsablePricing,
  isPerUnitPriced,
  isTokenPriced,
} from '../weighted-tokens.utility';
import { emptyTokenBreakdown, toRawTokenBreakdown } from '../raw-token-breakdown.utility';
import {
  affordableOutputTokens,
  clampOutputTokensToBalance,
  estimateInputCostMicroUsd,
} from '../affordability.utility';

// $2.50 / M input, $10.00 / M output — the only real rate pair in the repo
// (router-models model-cost.service.spec.ts uses these for gpt-4o).
function rates(overrides: Partial<ModelCostRates> = {}): ModelCostRates {
  return {
    provider: 'OPENAI',
    model: 'gpt-4o',
    version: 1,
    currency: 'USD',
    inputPerMillionMicroUsd: 2_500_000,
    outputPerMillionMicroUsd: 10_000_000,
    cachedInputPerMillionMicroUsd: 1_250_000,
    cacheWritePerMillionMicroUsd: null,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    costClass: ModelCostClass.STANDARD,
    isAdminOverride: false,
    effectiveFrom: new Date(0).toISOString(),
    lastVerifiedAt: null,
    source: 'SEED',
    ...overrides,
  };
}

const MIN_VIABLE = 256;

describe('estimateInputCostMicroUsd', () => {
  it('prices fresh and cached prompt tokens at their own rates', () => {
    // 1,000 fresh at $2.50/M = 2,500; 1,000 cached at $1.25/M = 1,250.
    expect(estimateInputCostMicroUsd(2000, 1000, rates())).toBe(3750);
  });

  it('falls back to the full input rate when no cache rate is published', () => {
    expect(
      estimateInputCostMicroUsd(2000, 1000, rates({ cachedInputPerMillionMicroUsd: null })),
    ).toBe(5000);
  });

  it('never lets the cached part exceed the prompt', () => {
    expect(estimateInputCostMicroUsd(100, 999, rates())).toBe(
      estimateInputCostMicroUsd(100, 100, rates()),
    );
  });
});

describe('affordableOutputTokens', () => {
  it('divides the remaining budget by the output rate', () => {
    // $0.10 remaining at $10/M output = 10,000 tokens.
    expect(affordableOutputTokens(100_000, rates())).toBe(10_000);
  });

  it('prices output at the REASONING rate when that is higher', () => {
    // A thinking model whose thoughts cost more than its answer must be sized
    // by the expensive rate, or a reasoning-heavy response outruns the budget.
    const thinking = rates({ reasoningPerMillionMicroUsd: 40_000_000 });
    expect(affordableOutputTokens(100_000, thinking)).toBe(2_500);
  });

  it('returns zero when nothing is left', () => {
    expect(affordableOutputTokens(0, rates())).toBe(0);
    expect(affordableOutputTokens(-5, rates())).toBe(0);
  });
});

describe('clampOutputTokensToBalance', () => {
  it('leaves a request untouched when the balance comfortably covers it', () => {
    const outcome = clampOutputTokensToBalance({
      rates: rates(),
      balanceMicroUsd: 5_000_000, // $5.00
      promptTokens: 1000,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 4096,
      minViableOutputTokens: MIN_VIABLE,
    });

    expect(outcome.status).toBe('AFFORDABLE');
    if (outcome.status !== 'AFFORDABLE') {
      throw new Error('expected AFFORDABLE');
    }
    expect(outcome.maxOutputTokens).toBe(4096);
    expect(outcome.clamped).toBe(false);
  });

  // The defect that made naive worst-case reservation unshippable: the platform
  // default max-output is 30,512 tokens, which costs $0.3076 — more than a
  // Starter plan's entire daily allowance. Reserving that refuses the user's
  // FIRST request of the day while their wallet is full.
  it('clamps the platform default down to what a small balance can pay for', () => {
    const outcome = clampOutputTokensToBalance({
      rates: rates(),
      balanceMicroUsd: 50_000, // $0.05 — starter's daily allowance
      promptTokens: 1000,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 30_512,
      minViableOutputTokens: MIN_VIABLE,
    });

    expect(outcome.status).toBe('AFFORDABLE');
    if (outcome.status !== 'AFFORDABLE') {
      throw new Error('expected AFFORDABLE');
    }
    // $0.05 − $0.0025 prompt = $0.0475 → 4,750 output tokens.
    expect(outcome.maxOutputTokens).toBe(4750);
    expect(outcome.clamped).toBe(true);
    expect(outcome.worstCaseCostMicroUsd).toBeLessThanOrEqual(50_000);
  });

  it('refuses when the prompt alone costs more than the balance', () => {
    const outcome = clampOutputTokensToBalance({
      rates: rates(),
      balanceMicroUsd: 100,
      promptTokens: 1_000_000,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 1024,
      minViableOutputTokens: MIN_VIABLE,
    });

    expect(outcome.status).toBe('PROMPT_UNAFFORDABLE');
  });

  it('refuses when the remainder cannot buy a usable answer', () => {
    // $0.0025 prompt + room for only ~50 output tokens.
    const outcome = clampOutputTokensToBalance({
      rates: rates(),
      balanceMicroUsd: 3_000,
      promptTokens: 1000,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 4096,
      minViableOutputTokens: MIN_VIABLE,
    });

    expect(outcome.status).toBe('OUTPUT_UNAFFORDABLE');
  });

  it('rejects a negative balance rather than treating it as free', () => {
    expect(() =>
      clampOutputTokensToBalance({
        rates: rates(),
        balanceMicroUsd: -1,
        promptTokens: 10,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: 1024,
        minViableOutputTokens: MIN_VIABLE,
      }),
    ).toThrow();
  });

  // The property the whole feature rests on. If this ever fails, "a user can
  // never exceed their credit" is false.
  it('PROPERTY: the true cost of a maximally long clamped response never exceeds the balance', () => {
    const model = rates();
    for (let balance = 3_000; balance <= 2_000_000; balance += 7_919) {
      const outcome = clampOutputTokensToBalance({
        rates: model,
        balanceMicroUsd: balance,
        promptTokens: 800,
        cachedPromptTokens: 200,
        requestedMaxOutputTokens: 30_512,
        minViableOutputTokens: MIN_VIABLE,
      });
      if (outcome.status !== 'AFFORDABLE') {
        continue;
      }

      // Worst realistic outcome: the model emits every token it was allowed to.
      const actual = calculateCostMicroUsd(
        toRawTokenBreakdown({
          promptTokens: 800,
          completionTokens: outcome.maxOutputTokens,
          totalTokens: 800 + outcome.maxOutputTokens,
          cachedPromptTokens: 200,
          reasoningTokens: 0,
          estimated: false,
          source: TokenUsageSource.NATIVE,
        }),
        model,
      );

      expect(actual).toBeLessThanOrEqual(balance);
      expect(outcome.worstCaseCostMicroUsd).toBeLessThanOrEqual(balance);
      expect(actual).toBeLessThanOrEqual(outcome.worstCaseCostMicroUsd);
    }
  });
});

describe('toRawTokenBreakdown', () => {
  it('subtracts sub-counts so nothing is billed twice', () => {
    const raw = toRawTokenBreakdown({
      promptTokens: 1000,
      completionTokens: 900,
      totalTokens: 1900,
      cachedPromptTokens: 750,
      reasoningTokens: 800,
      estimated: false,
      source: TokenUsageSource.NATIVE,
    });

    expect(raw).toEqual({
      inputTokens: 250,
      cachedInputTokens: 750,
      reasoningTokens: 800,
      outputTokens: 100,
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 0,
    });
    // The four token fields still add up to what the provider reported.
    expect(raw.inputTokens + raw.cachedInputTokens).toBe(1000);
    expect(raw.outputTokens + raw.reasoningTokens).toBe(900);
  });

  it('carries orchestrator-counted tool and search calls', () => {
    const raw = toRawTokenBreakdown(
      {
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        estimated: false,
        source: TokenUsageSource.NATIVE,
      },
      { toolCalls: 3, searchCalls: 1 },
    );

    expect(raw.toolCalls).toBe(3);
    expect(raw.searchCalls).toBe(1);
  });
});

// An image endpoint returns no token usage at all. Before `imageUnits` existed,
// `calculateCostMicroUsd` summed six token/call fields and never touched
// `imagePerUnitMicroUsd`, so a DALL-E generation priced at exactly $0 and its
// whole hold was released — while a row priced ONLY per unit failed
// `hasUsablePricing` and was refused as UNPRICED. Both bugs, one missing branch.
describe('per-unit (image) pricing', () => {
  const imageOnly = rates({
    provider: 'OPENAI',
    model: 'gpt-image-1',
    inputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: null,
    cachedInputPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: 40_000, // $0.04 per image
  });

  it('treats a per-unit-only model as priced', () => {
    expect(hasUsablePricing(imageOnly)).toBe(true);
    expect(isTokenPriced(imageOnly)).toBe(false);
    expect(isPerUnitPriced(imageOnly)).toBe(true);
  });

  it('charges for the image rather than pricing it at zero', () => {
    const cost = calculateCostMicroUsd({ ...emptyTokenBreakdown(), imageUnits: 3 }, imageOnly);
    expect(cost).toBe(120_000);
  });

  it('holds the image cost up front, since it is fixed before the call', () => {
    const outcome = clampOutputTokensToBalance({
      rates: imageOnly,
      balanceMicroUsd: 100_000, // $0.10
      promptTokens: 0,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 1,
      minViableOutputTokens: 0,
      imageUnits: 2, // $0.08
    });

    expect(outcome.status).toBe('AFFORDABLE');
    if (outcome.status !== 'AFFORDABLE') {
      throw new Error('expected AFFORDABLE');
    }
    expect(outcome.worstCaseCostMicroUsd).toBe(80_000);
  });

  it('refuses when the balance cannot cover the images', () => {
    const outcome = clampOutputTokensToBalance({
      rates: imageOnly,
      balanceMicroUsd: 30_000,
      promptTokens: 0,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 1,
      minViableOutputTokens: 0,
      imageUnits: 1,
    });

    expect(outcome.status).toBe('PROMPT_UNAFFORDABLE');
  });

  it('still refuses a model with no price of any kind', () => {
    expect(
      hasUsablePricing(
        rates({
          inputPerMillionMicroUsd: null,
          outputPerMillionMicroUsd: null,
          imagePerUnitMicroUsd: null,
        }),
      ),
    ).toBe(false);
  });
});
