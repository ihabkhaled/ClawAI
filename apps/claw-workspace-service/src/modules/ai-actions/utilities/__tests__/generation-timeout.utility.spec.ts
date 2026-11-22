import {
  GENERATION_TIMEOUT_MAX_MS,
  GENERATION_TIMEOUT_MIN_MS,
} from '../../constants/generation-timeout.constants';
import { clampGenerationTimeoutMs } from '../generation-timeout.utility';

describe('clampGenerationTimeoutMs (CodeQL js/resource-exhaustion)', () => {
  it('passes an in-range timeout through unchanged', () => {
    expect(clampGenerationTimeoutMs(5_000)).toBe(5_000);
    expect(clampGenerationTimeoutMs(300_000)).toBe(300_000);
  });

  it('keeps a tiny remaining-deadline budget (chain drafter passes 1 ms)', () => {
    expect(clampGenerationTimeoutMs(1)).toBe(1);
  });

  it('raises zero or negative values to the floor', () => {
    expect(clampGenerationTimeoutMs(0)).toBe(GENERATION_TIMEOUT_MIN_MS);
    expect(clampGenerationTimeoutMs(-50)).toBe(GENERATION_TIMEOUT_MIN_MS);
  });

  it('caps a huge caller-supplied timeout at the ceiling', () => {
    expect(clampGenerationTimeoutMs(GENERATION_TIMEOUT_MAX_MS + 1)).toBe(GENERATION_TIMEOUT_MAX_MS);
    expect(clampGenerationTimeoutMs(Number.MAX_SAFE_INTEGER)).toBe(GENERATION_TIMEOUT_MAX_MS);
  });

  it('gives a non-finite value the ceiling, never an unbounded timer', () => {
    expect(clampGenerationTimeoutMs(Number.POSITIVE_INFINITY)).toBe(GENERATION_TIMEOUT_MAX_MS);
    expect(clampGenerationTimeoutMs(Number.NaN)).toBe(GENERATION_TIMEOUT_MAX_MS);
  });
});
