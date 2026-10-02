import {
  computeWindowFitMaxTokens,
  OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS,
  OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS,
} from '../output-token-bounds.constants';

describe('computeWindowFitMaxTokens', () => {
  it('shrinks the hosted default to fit gpt-4 (8192 window, 433 prompt tokens)', () => {
    expect(
      computeWindowFitMaxTokens(8192, 433, OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS),
    ).toBe(8192 - 433 - 256);
  });

  it('does nothing when the window is unknown', () => {
    expect(computeWindowFitMaxTokens(undefined, 433, 16_384)).toBeUndefined();
  });

  it('does nothing when the request already fits', () => {
    expect(computeWindowFitMaxTokens(128_000, 433, 16_384)).toBeUndefined();
  });

  it('never goes below the output floor', () => {
    expect(computeWindowFitMaxTokens(8192, 8000, 16_384)).toBe(OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS);
  });
});
