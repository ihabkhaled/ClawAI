import type { ProviderTokenRates } from '../../types/provider-credit.types';

import { providerAffordableOutputTokens } from '../provider-affordability.utility';

// $0.60/M input, $2.20/M output — integer micro-USD per million tokens.
const RATES: ProviderTokenRates = {
  inputPerMillionMicroUsd: 600_000,
  outputPerMillionMicroUsd: 2_200_000,
  reasoningPerMillionMicroUsd: null,
};

describe('providerAffordableOutputTokens', () => {
  it('is floor((remaining − input cost) / output price × 0.9)', () => {
    // $0.02 left, 1,000 prompt tokens = 600 µ$ input; 19,400 µ$ / 2.2 µ$ per token
    // = 8,818 tokens; × 0.9 = 7,936.
    expect(providerAffordableOutputTokens(20_000, 1_000, RATES)).toBe(7_936);
  });

  it('rounds the input cost UP and the tokens DOWN (never overshoots)', () => {
    // 1 prompt token costs 0.6 µ$ → 1 µ$. 21 µ$ left → 20 µ$ / 2.2 = 9.09 → 9 → ×0.9 = 8.
    expect(providerAffordableOutputTokens(21, 1, RATES)).toBe(8);
  });

  it('is zero when the prompt alone uses the balance up', () => {
    expect(providerAffordableOutputTokens(600, 1_000, RATES)).toBe(0);
    expect(providerAffordableOutputTokens(0, 0, RATES)).toBe(0);
  });

  it('prices output at the dearer of the answer and reasoning rates', () => {
    const reasoning: ProviderTokenRates = { ...RATES, reasoningPerMillionMicroUsd: 4_400_000 };
    expect(providerAffordableOutputTokens(20_000, 1_000, reasoning)).toBe(3_968);
  });

  it('is undefined (no cap) when the model has no output price', () => {
    const free: ProviderTokenRates = { ...RATES, outputPerMillionMicroUsd: null };
    expect(providerAffordableOutputTokens(20_000, 1_000, free)).toBeUndefined();
  });

  it('keeps precision on a balance too large for float multiplication', () => {
    // $100,000 left at $0.10/M: 1e11 µ$ × 1e6 overflows 2^53 as a number.
    const cheap: ProviderTokenRates = { ...RATES, outputPerMillionMicroUsd: 100_000 };
    expect(providerAffordableOutputTokens(100_000_000_000, 0, cheap)).toBe(900_000_000_000);
  });
});
