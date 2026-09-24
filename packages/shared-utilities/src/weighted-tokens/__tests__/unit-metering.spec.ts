import { ModelCostClass, type ModelCostRates, TokenUsageSource } from '@claw/shared-types';

import { MoneyError } from '../../money/money-error';
import { clampOutputTokensToBalance } from '../affordability.utility';
import { emptyTokenBreakdown, toRawTokenBreakdown } from '../raw-token-breakdown.utility';
import {
  calculateCostMicroUsd,
  calculateUnitCostMicroUsd,
  hasUsablePricing,
  isPerUnitPriced,
} from '../weighted-tokens.utility';

// Unit metering: images, seconds of input audio and characters of synthesised
// speech, each priced by its own per-unit column. OpenAI's own list prices are
// used as the fixtures so the arithmetic is checkable by hand:
//   gpt-image-1 high 1024x1024  $0.167 / image  = 167_000 micro-USD
//   whisper-1                   $0.006 / minute = 100 micro-USD / second
//   tts-1                       $15 / 1M chars  = 15 micro-USD / character
function rates(overrides: Partial<ModelCostRates> = {}): ModelCostRates {
  return {
    provider: 'OPENAI',
    model: 'multi-unit-fixture',
    version: 1,
    currency: 'USD',
    inputPerMillionMicroUsd: 0,
    outputPerMillionMicroUsd: 0,
    cachedInputPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: 167_000,
    audioPerUnitMicroUsd: 100,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    ttsPerCharacterMicroUsd: 15,
    costClass: ModelCostClass.PREMIUM,
    isAdminOverride: false,
    effectiveFrom: new Date(0).toISOString(),
    lastVerifiedAt: null,
    source: 'SEED',
    ...overrides,
  };
}

describe('unit metering — calculateCostMicroUsd', () => {
  it('sums images, audio seconds and tts characters at their own rates', () => {
    const cost = calculateCostMicroUsd(
      { ...emptyTokenBreakdown(), imageUnits: 2, audioSeconds: 90, ttsCharacters: 1_000 },
      rates(),
    );
    // 2 × 167_000 + 90 × 100 + 1_000 × 15 = 334_000 + 9_000 + 15_000
    expect(cost).toBe(358_000);
  });

  it('charges a transcription per SECOND of input audio', () => {
    const cost = calculateCostMicroUsd({ ...emptyTokenBreakdown(), audioSeconds: 60 }, rates());
    // One minute of whisper-1 is $0.006.
    expect(cost).toBe(6_000);
  });

  it('charges speech per character', () => {
    const cost = calculateCostMicroUsd(
      { ...emptyTokenBreakdown(), ttsCharacters: 100_000 },
      rates(),
    );
    expect(cost).toBe(1_500_000);
  });

  it('adds unit cost on top of token cost rather than replacing it', () => {
    const cost = calculateCostMicroUsd(
      { ...emptyTokenBreakdown(), inputTokens: 1_000, imageUnits: 1 },
      rates({ inputPerMillionMicroUsd: 5_000_000 }),
    );
    // 1_000 × $5/M = 5_000, plus one image.
    expect(cost).toBe(172_000);
  });

  it('treats an absent unit count as zero — a token-only breakdown is unchanged', () => {
    const tokenOnly = {
      inputTokens: 1_000,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 0,
    };
    expect(calculateCostMicroUsd(tokenOnly, rates({ inputPerMillionMicroUsd: 5_000_000 }))).toBe(
      5_000,
    );
  });

  it('prices a unit at zero when its rate is null (not published)', () => {
    const cost = calculateCostMicroUsd(
      { ...emptyTokenBreakdown(), audioSeconds: 60, ttsCharacters: 60 },
      rates({ audioPerUnitMicroUsd: null, ttsPerCharacterMicroUsd: null }),
    );
    expect(cost).toBe(0);
  });

  it('is exact at the edge of the safe-integer range (BigInt, no float drift)', () => {
    // 3 × 3_002_399_751_580_330 = 9_007_199_254_740_990, two below MAX_SAFE.
    // The same product through `number` arithmetic is exact here too, but the
    // next step up would silently lose precision as a float — BigInt refuses it.
    const nearMax = 3_002_399_751_580_330;
    expect(
      calculateCostMicroUsd(
        { ...emptyTokenBreakdown(), imageUnits: 3 },
        rates({ imagePerUnitMicroUsd: nearMax }),
      ),
    ).toBe(9_007_199_254_740_990);
  });

  it('refuses a total past the safe-integer range instead of rounding it', () => {
    expect(() =>
      calculateCostMicroUsd(
        { ...emptyTokenBreakdown(), imageUnits: 4 },
        rates({ imagePerUnitMicroUsd: 3_002_399_751_580_330 }),
      ),
    ).toThrow(MoneyError);
  });

  it('refuses a fractional unit count', () => {
    expect(() =>
      calculateCostMicroUsd({ ...emptyTokenBreakdown(), audioSeconds: 1.5 }, rates()),
    ).toThrow(MoneyError);
  });

  it('refuses a fractional per-unit rate', () => {
    expect(() =>
      calculateUnitCostMicroUsd({ ttsCharacters: 10 }, rates({ ttsPerCharacterMicroUsd: 0.5 })),
    ).toThrow(MoneyError);
  });
});

describe('unit metering — calculateUnitCostMicroUsd', () => {
  it('prices only the unit side', () => {
    expect(
      calculateUnitCostMicroUsd(
        { imageUnits: 1, audioSeconds: 10, ttsCharacters: 10 },
        rates({ inputPerMillionMicroUsd: 99_000_000 }),
      ),
    ).toBe(167_000 + 1_000 + 150);
  });

  it('is zero for no units', () => {
    expect(calculateUnitCostMicroUsd({}, rates())).toBe(0);
  });
});

describe('unit metering — pricing classification', () => {
  it('treats a model priced only per second of audio as priced', () => {
    const audioOnly = rates({
      inputPerMillionMicroUsd: null,
      outputPerMillionMicroUsd: null,
      imagePerUnitMicroUsd: null,
      ttsPerCharacterMicroUsd: null,
    });
    expect(isPerUnitPriced(audioOnly)).toBe(true);
    expect(hasUsablePricing(audioOnly)).toBe(true);
  });

  it('treats a model priced only per tts character as priced', () => {
    const ttsOnly = rates({
      inputPerMillionMicroUsd: null,
      outputPerMillionMicroUsd: null,
      imagePerUnitMicroUsd: null,
      audioPerUnitMicroUsd: null,
    });
    expect(isPerUnitPriced(ttsOnly)).toBe(true);
  });

  it('does not treat all-zero per-unit rates as priced per unit', () => {
    expect(
      isPerUnitPriced(
        rates({ imagePerUnitMicroUsd: 0, audioPerUnitMicroUsd: 0, ttsPerCharacterMicroUsd: 0 }),
      ),
    ).toBe(false);
  });
});

describe('unit metering — reservation sizing', () => {
  it('holds the expected audio and tts cost up front', () => {
    const outcome = clampOutputTokensToBalance({
      rates: rates(),
      balanceMicroUsd: 1_000_000,
      promptTokens: 0,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 8_192,
      minViableOutputTokens: 256,
      audioSeconds: 600,
      ttsCharacters: 2_000,
    });
    expect(outcome).toEqual({
      status: 'AFFORDABLE',
      maxOutputTokens: 8_192,
      clamped: false,
      // 600 × 100 + 2_000 × 15, and a zero output rate adds nothing.
      worstCaseCostMicroUsd: 90_000,
    });
  });

  it('refuses when the expected units alone exceed the balance', () => {
    const outcome = clampOutputTokensToBalance({
      rates: rates(),
      balanceMicroUsd: 100_000,
      promptTokens: 0,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 8_192,
      minViableOutputTokens: 256,
      imageUnits: 1,
    });
    expect(outcome).toEqual({ status: 'PROMPT_UNAFFORDABLE', promptCostMicroUsd: 167_000 });
  });
});

describe('unit metering — toRawTokenBreakdown', () => {
  it('carries audio seconds and tts characters from the orchestrator counts', () => {
    const raw = toRawTokenBreakdown(
      {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        estimated: false,
        source: TokenUsageSource.NATIVE,
      },
      { audioSeconds: 42, ttsCharacters: 7, imageUnits: 1 },
    );
    expect(raw).toMatchObject({ audioSeconds: 42, ttsCharacters: 7, imageUnits: 1 });
  });

  it('defaults both new counts to zero', () => {
    expect(emptyTokenBreakdown()).toMatchObject({ audioSeconds: 0, ttsCharacters: 0 });
  });
});
