import { ModelCostClass, type ModelCostRates, TokenUsageSource } from '@claw/shared-types';

import { extractAnthropicUsage } from '../../token-usage/extract-anthropic-usage.utility';
import { clampOutputTokensToBalance, estimateInputCostMicroUsd } from '../affordability.utility';
import { toRawTokenBreakdown } from '../raw-token-breakdown.utility';
import { calculateCostMicroUsd, effectiveCacheWriteRate } from '../weighted-tokens.utility';

/**
 * F093: a prompt-cache WRITE is billed at the model's `cacheWritePerMillionMicroUsd`
 * ONLY when that rate row is published. These cases pin the money invariants:
 *
 *  1. The three prompt slices (fresh input, cache read, cache write) are DISJOINT
 *     and always sum to the prompt total, so no token is billed twice or dropped.
 *  2. With a published write rate, the cost equals an independent BigInt
 *     reference computation, to the micro-USD.
 *  3. With NO write rate (null, zero, non-finite), the cache fields change
 *     nothing: the bill is byte-for-byte what it was before F093, and a write is
 *     never free.
 *  4. The PAYG hold, sized for an armed request, covers the worst-case settle.
 *     Settlement is capped at the hold, so an under-sized hold would absorb the
 *     write premium as margin loss.
 *
 * The payloads are the `usage` object shapes of Anthropic's Messages API
 * (`input_tokens` EXCLUDES both cache counters). They are hand-written to those
 * documented shapes, not captured from a live call.
 */

// Anthropic Sonnet-class seed row: input $3/M, cache read 0.1x, write 1.25x, output $15/M.
function sonnet(overrides: Partial<ModelCostRates> = {}): ModelCostRates {
  return {
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4',
    version: 1,
    currency: 'USD',
    inputPerMillionMicroUsd: 3_000_000,
    outputPerMillionMicroUsd: 15_000_000,
    cachedInputPerMillionMicroUsd: 300_000,
    cacheWritePerMillionMicroUsd: 3_750_000,
    reasoningPerMillionMicroUsd: 15_000_000,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    ttsPerCharacterMicroUsd: null,
    costClass: ModelCostClass.PREMIUM,
    isAdminOverride: false,
    effectiveFrom: new Date(0).toISOString(),
    lastVerifiedAt: null,
    source: 'SEED',
    ...overrides,
  };
}

const NO_WRITE_RATE = sonnet({ cacheWritePerMillionMicroUsd: null });

const COLD_WRITE = {
  usage: {
    input_tokens: 12,
    cache_creation_input_tokens: 8000,
    cache_read_input_tokens: 0,
    output_tokens: 450,
  },
};
const WARM_READ = {
  usage: {
    input_tokens: 25,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 8000,
    output_tokens: 300,
  },
};
const MIXED = {
  usage: {
    input_tokens: 40,
    cache_creation_input_tokens: 1200,
    cache_read_input_tokens: 6800,
    output_tokens: 90,
  },
};
const NO_CACHE_FIELDS = { usage: { input_tokens: 900, output_tokens: 120 } };
const ZERO_CACHE_FIELDS = {
  usage: {
    input_tokens: 900,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    output_tokens: 120,
  },
};
const WRITE_ONLY_FIELD = {
  usage: { input_tokens: 10, cache_creation_input_tokens: 500, output_tokens: 5 },
};
const LARGE = {
  usage: {
    input_tokens: 1_000,
    cache_creation_input_tokens: 4_000_000,
    cache_read_input_tokens: 2_000_000,
    output_tokens: 64_000,
  },
};

function breakdownOf(response: unknown) {
  return toRawTokenBreakdown(extractAnthropicUsage(response));
}

/** Independent reference: ceil(units * rate / 1e6) in BigInt, never touching the production helper. */
function refCost(units: number, rate: number | null): bigint {
  if (rate === null || units <= 0) {
    return 0n;
  }
  const product = BigInt(units) * BigInt(rate);
  return (product + 999_999n) / 1_000_000n;
}

describe('extractAnthropicUsage -> toRawTokenBreakdown: the three prompt slices', () => {
  it.each([
    ['cold write', COLD_WRITE, 12, 0, 8000],
    ['warm read', WARM_READ, 25, 8000, 0],
    ['mixed', MIXED, 40, 6800, 1200],
    ['no cache fields', NO_CACHE_FIELDS, 900, 0, 0],
    ['zero cache fields', ZERO_CACHE_FIELDS, 900, 0, 0],
    ['write field only', WRITE_ONLY_FIELD, 10, 0, 500],
    ['large counts', LARGE, 1_000, 2_000_000, 4_000_000],
  ])(
    '%s: fresh/read/write are disjoint and sum to the prompt total',
    (_name, payload, fresh, read, write) => {
      const usage = extractAnthropicUsage(payload);
      const raw = toRawTokenBreakdown(usage);

      expect(usage.promptTokens).toBe(fresh + read + write);
      expect(raw.inputTokens).toBe(fresh);
      expect(raw.cachedInputTokens).toBe(read);
      expect(raw.cacheWriteInputTokens ?? 0).toBe(write);
      expect(raw.inputTokens + raw.cachedInputTokens + (raw.cacheWriteInputTokens ?? 0)).toBe(
        usage.promptTokens,
      );
    },
  );

  it('omits the write field entirely when nothing was written', () => {
    expect(breakdownOf(WARM_READ)).not.toHaveProperty('cacheWriteInputTokens');
    expect(breakdownOf(NO_CACHE_FIELDS)).not.toHaveProperty('cacheWriteInputTokens');
    expect(extractAnthropicUsage(ZERO_CACHE_FIELDS)).not.toHaveProperty(
      'cacheCreationPromptTokens',
    );
  });

  it.each([
    [
      'negative',
      { usage: { input_tokens: 10, cache_creation_input_tokens: -5, output_tokens: 1 } },
    ],
    [
      'NaN',
      { usage: { input_tokens: 10, cache_creation_input_tokens: Number.NaN, output_tokens: 1 } },
    ],
    [
      'Infinity',
      { usage: { input_tokens: 10, cache_creation_input_tokens: Infinity, output_tokens: 1 } },
    ],
    [
      'non-numeric string',
      { usage: { input_tokens: 10, cache_creation_input_tokens: 'lots', output_tokens: 1 } },
    ],
    ['null', { usage: { input_tokens: 10, cache_creation_input_tokens: null, output_tokens: 1 } }],
  ])(
    'a malformed write count (%s) is read as no write, never as a negative charge',
    (_n, payload) => {
      const raw = breakdownOf(payload);
      expect(raw.cacheWriteInputTokens ?? 0).toBe(0);
      expect(raw.inputTokens).toBe(10);
    },
  );

  it('a fractional write count is floored to an integer', () => {
    const raw = breakdownOf({
      usage: { input_tokens: 10, cache_creation_input_tokens: 12.9, output_tokens: 1 },
    });
    expect(raw.cacheWriteInputTokens).toBe(12);
  });

  it('a write count larger than the prompt can hold is clamped, never over-billed', () => {
    // Hand-built, malformed usage: 100 prompt tokens, 80 read, 500 "written".
    const raw = toRawTokenBreakdown({
      promptTokens: 100,
      completionTokens: 10,
      totalTokens: 110,
      cachedPromptTokens: 80,
      cacheCreationPromptTokens: 500,
      reasoningTokens: 0,
      estimated: false,
      source: TokenUsageSource.NATIVE,
    });
    expect(raw.cachedInputTokens).toBe(80);
    expect(raw.cacheWriteInputTokens).toBe(20);
    expect(raw.inputTokens).toBe(0);
    expect(raw.inputTokens + raw.cachedInputTokens + (raw.cacheWriteInputTokens ?? 0)).toBe(100);
  });

  it('an absent usage block yields an estimate with no cache write', () => {
    const raw = toRawTokenBreakdown(extractAnthropicUsage({}, { promptText: 'abcdabcd' }));
    expect(raw.cacheWriteInputTokens ?? 0).toBe(0);
  });
});

describe('calculateCostMicroUsd: cache write at a published rate', () => {
  it('prices a cold write at the write rate (exact)', () => {
    const raw = breakdownOf(COLD_WRITE);
    // 12 fresh * $3/M + 8000 write * $3.75/M + 450 out * $15/M, each ceil'd once.
    const expected = refCost(12, 3_000_000) + refCost(8000, 3_750_000) + refCost(450, 15_000_000);
    expect(BigInt(calculateCostMicroUsd(raw, sonnet()))).toBe(expected);
    expect(expected).toBe(36n + 30_000n + 6_750n);
  });

  it('prices a warm read at the cache-read rate and charges no write premium', () => {
    const raw = breakdownOf(WARM_READ);
    const expected = refCost(25, 3_000_000) + refCost(8000, 300_000) + refCost(300, 15_000_000);
    expect(BigInt(calculateCostMicroUsd(raw, sonnet()))).toBe(expected);
  });

  it('prices a mixed turn slice by slice', () => {
    const raw = breakdownOf(MIXED);
    const expected =
      refCost(40, 3_000_000) +
      refCost(6800, 300_000) +
      refCost(1200, 3_750_000) +
      refCost(90, 15_000_000);
    expect(BigInt(calculateCostMicroUsd(raw, sonnet()))).toBe(expected);
  });

  it('stays exact at large counts (4M written tokens)', () => {
    const raw = breakdownOf(LARGE);
    const expected =
      refCost(1_000, 3_000_000) +
      refCost(2_000_000, 300_000) +
      refCost(4_000_000, 3_750_000) +
      refCost(64_000, 15_000_000);
    const actual = calculateCostMicroUsd(raw, sonnet());
    expect(Number.isSafeInteger(actual)).toBe(true);
    expect(BigInt(actual)).toBe(expected);
  });

  it('a write costs strictly more than the same tokens read, and more than fresh input', () => {
    const write = calculateCostMicroUsd(breakdownOf(COLD_WRITE), sonnet());
    const asFresh = calculateCostMicroUsd(
      breakdownOf({ usage: { input_tokens: 8012, output_tokens: 450 } }),
      sonnet(),
    );
    expect(write).toBeGreaterThan(asFresh);
  });
});

describe('calculateCostMicroUsd: no published write rate means the field changes nothing', () => {
  const unpublished: Array<[string, ModelCostRates]> = [
    ['null', NO_WRITE_RATE],
    ['zero', sonnet({ cacheWritePerMillionMicroUsd: 0 })],
    ['negative', sonnet({ cacheWritePerMillionMicroUsd: -1 })],
    ['NaN', sonnet({ cacheWritePerMillionMicroUsd: Number.NaN })],
  ];

  it.each(unpublished)(
    'rate %s: the write is billed as ordinary input, never free',
    (_n, rates) => {
      const withField = calculateCostMicroUsd(breakdownOf(COLD_WRITE), rates);
      // The same prompt reported WITHOUT the cache field: everything is plain input.
      const withoutField = calculateCostMicroUsd(
        breakdownOf({ usage: { input_tokens: 8012, output_tokens: 450 } }),
        rates,
      );
      expect(withField).toBe(withoutField);
      expect(withField).toBeGreaterThan(
        calculateCostMicroUsd(
          breakdownOf({ usage: { input_tokens: 12, output_tokens: 450 } }),
          rates,
        ),
      );
    },
  );

  it('the write rate falls back to the input rate, and to null when neither exists', () => {
    expect(effectiveCacheWriteRate(NO_WRITE_RATE)).toBe(3_000_000);
    expect(effectiveCacheWriteRate(sonnet())).toBe(3_750_000);
    expect(
      effectiveCacheWriteRate(
        sonnet({ cacheWritePerMillionMicroUsd: null, inputPerMillionMicroUsd: null }),
      ),
    ).toBeNull();
  });

  it('a breakdown with no write tokens prices identically to the pre-F093 formula', () => {
    for (const payload of [WARM_READ, NO_CACHE_FIELDS, ZERO_CACHE_FIELDS]) {
      const raw = breakdownOf(payload);
      const legacy =
        refCost(raw.inputTokens, 3_000_000) +
        refCost(raw.cachedInputTokens, 300_000) +
        refCost(raw.outputTokens, 15_000_000);
      expect(BigInt(calculateCostMicroUsd(raw, sonnet()))).toBe(legacy);
    }
  });
});

describe('property: the cost always equals the independent reference', () => {
  // Deterministic LCG so a failure reproduces; no Math.random in a money test.
  function lcg(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return state;
    };
  }

  it('500 random Anthropic usage payloads, with and without a write rate', () => {
    const next = lcg(93);
    for (let i = 0; i < 500; i += 1) {
      const fresh = next() % 50_000;
      const read = next() % 3 === 0 ? 0 : next() % 2_000_000;
      const write = next() % 3 === 0 ? 0 : next() % 2_000_000;
      const out = next() % 100_000;
      const payload = {
        usage: {
          input_tokens: fresh,
          cache_read_input_tokens: read,
          cache_creation_input_tokens: write,
          output_tokens: out,
        },
      };
      const usage = extractAnthropicUsage(payload);
      const raw = toRawTokenBreakdown(usage);

      expect(usage.promptTokens).toBe(fresh + read + write);
      expect(raw.inputTokens + raw.cachedInputTokens + (raw.cacheWriteInputTokens ?? 0)).toBe(
        usage.promptTokens,
      );

      const priced = calculateCostMicroUsd(raw, sonnet());
      const refPriced =
        refCost(fresh, 3_000_000) +
        refCost(read, 300_000) +
        refCost(write, 3_750_000) +
        refCost(out, 15_000_000);
      expect(Number.isInteger(priced)).toBe(true);
      expect(BigInt(priced)).toBe(refPriced);

      const unpriced = calculateCostMicroUsd(raw, NO_WRITE_RATE);
      const refUnpriced =
        refCost(fresh, 3_000_000) +
        refCost(write, 3_000_000) +
        refCost(read, 300_000) +
        refCost(out, 15_000_000);
      expect(BigInt(unpriced)).toBe(refUnpriced);
      // The premium is never negative: a published write rate never under-bills.
      expect(priced).toBeGreaterThanOrEqual(unpriced);
    }
  });
});

describe('the PAYG hold covers the cache-write premium', () => {
  const PROMPT = 8_000;
  const MAX_OUT = 2_000;

  it('prices the armed prompt at the write rate, the unarmed one exactly as before F093', () => {
    const plain = estimateInputCostMicroUsd(PROMPT, 0, sonnet());
    const armed = estimateInputCostMicroUsd(PROMPT, 0, sonnet(), PROMPT);
    expect(plain).toBe(Number(refCost(PROMPT, 3_000_000)));
    expect(armed).toBe(Number(refCost(PROMPT, 3_750_000)));
    expect(armed).toBeGreaterThan(plain);
  });

  it('adds nothing when the model publishes no write rate', () => {
    expect(estimateInputCostMicroUsd(PROMPT, 0, NO_WRITE_RATE, PROMPT)).toBe(
      estimateInputCostMicroUsd(PROMPT, 0, NO_WRITE_RATE),
    );
  });

  it('never prices a write BELOW input, even when a row is mis-seeded cheaper', () => {
    const cheap = sonnet({ cacheWritePerMillionMicroUsd: 1_000_000 });
    expect(estimateInputCostMicroUsd(PROMPT, 0, cheap, PROMPT)).toBe(
      estimateInputCostMicroUsd(PROMPT, 0, cheap),
    );
  });

  it('caps the held write portion at the fresh prompt', () => {
    expect(estimateInputCostMicroUsd(PROMPT, 0, sonnet(), PROMPT * 10)).toBe(
      estimateInputCostMicroUsd(PROMPT, 0, sonnet(), PROMPT),
    );
    expect(estimateInputCostMicroUsd(PROMPT, 0, sonnet(), -5)).toBe(
      estimateInputCostMicroUsd(PROMPT, 0, sonnet()),
    );
  });

  it('an armed hold is never smaller than any worst-case settle of the same request (200 cases)', () => {
    let state = 7;
    const next = (): number => {
      state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return state;
    };
    for (let i = 0; i < 200; i += 1) {
      const prompt = 1 + (next() % 60_000);
      const maxOut = 1 + (next() % 4_000);
      const outcome = clampOutputTokensToBalance({
        rates: sonnet(),
        balanceMicroUsd: 10_000_000_000,
        promptTokens: prompt,
        cachedPromptTokens: 0,
        cacheWritePromptTokens: prompt,
        requestedMaxOutputTokens: maxOut,
        minViableOutputTokens: 1,
      });
      if (outcome.status !== 'AFFORDABLE') {
        throw new Error('balance is large enough for every case');
      }
      // Worst legal settle: the entire prompt written, the entire ceiling generated.
      const worst = calculateCostMicroUsd(
        toRawTokenBreakdown({
          promptTokens: prompt,
          completionTokens: outcome.maxOutputTokens,
          totalTokens: prompt + outcome.maxOutputTokens,
          cachedPromptTokens: 0,
          cacheCreationPromptTokens: prompt,
          reasoningTokens: 0,
          estimated: false,
          source: TokenUsageSource.NATIVE,
        }),
        sonnet(),
      );
      expect(outcome.worstCaseCostMicroUsd).toBeGreaterThanOrEqual(worst);
    }
  });

  it('WITHOUT the armed sizing the same worst settle would exceed the hold (the margin loss this prevents)', () => {
    const prompt = PROMPT;
    const unarmed = clampOutputTokensToBalance({
      rates: sonnet(),
      balanceMicroUsd: 10_000_000_000,
      promptTokens: prompt,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: MAX_OUT,
      minViableOutputTokens: 1,
    });
    if (unarmed.status !== 'AFFORDABLE') {
      throw new Error('affordable');
    }
    const worst = calculateCostMicroUsd(
      toRawTokenBreakdown({
        promptTokens: prompt,
        completionTokens: MAX_OUT,
        totalTokens: prompt + MAX_OUT,
        cachedPromptTokens: 0,
        cacheCreationPromptTokens: prompt,
        reasoningTokens: 0,
        estimated: false,
        source: TokenUsageSource.NATIVE,
      }),
      sonnet(),
    );
    expect(worst).toBeGreaterThan(unarmed.worstCaseCostMicroUsd);
  });
});
