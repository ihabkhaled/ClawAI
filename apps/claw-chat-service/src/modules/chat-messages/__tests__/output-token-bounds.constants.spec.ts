import {
  computeDefaultMaxTokens,
  OUTPUT_BOUNDS_DEFAULT_CTX_SIZE,
  OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS,
  OUTPUT_BOUNDS_SAFETY_MARGIN,
} from '../constants/output-token-bounds.constants';

// Bug-hunt 2026-05-31, Fix 3 — these tests pin the defensive default
// `max_tokens` computation that bounds runaway generation AND lets
// `finish_reason: 'length'` cleanly signal "we hit YOUR cap" instead of
// "we hit the resident server's ctx ceiling" (which is silent and
// mid-sentence).
describe('output-token-bounds: computeDefaultMaxTokens', () => {
  it('exposes the documented defaults', () => {
    expect(OUTPUT_BOUNDS_DEFAULT_CTX_SIZE).toBe(32_768);
    expect(OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS).toBe(512);
    expect(OUTPUT_BOUNDS_SAFETY_MARGIN).toBe(256);
  });

  it('returns ctxSize - promptTokens - SAFETY_MARGIN when prompt leaves plenty of room', () => {
    // 32768 - 1000 - 256 = 31_512
    expect(computeDefaultMaxTokens(32_768, 1_000)).toBe(31_512);
  });

  it('clamps to MIN_OUTPUT_TOKENS when the prompt has nearly exhausted ctx', () => {
    // 8192 - 7800 - 256 = 136 → below the 512 floor → clamp.
    expect(computeDefaultMaxTokens(8_192, 7_800)).toBe(OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS);
    expect(OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS).toBe(512);
  });

  it('clamps to MIN_OUTPUT_TOKENS even when available would be negative', () => {
    // 4096 - 10000 - 256 = -6160 → clamp to floor (never negative or zero).
    expect(computeDefaultMaxTokens(4_096, 10_000)).toBe(OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS);
  });

  it('returns full ctx headroom when the prompt is empty', () => {
    // 32768 - 0 - 256 = 32_512
    expect(computeDefaultMaxTokens(32_768, 0)).toBe(32_512);
  });

  it('returns exactly the floor when computed value equals MIN_OUTPUT_TOKENS', () => {
    // Pick ctxSize so available == 512 exactly: 512 + 256 + promptTokens.
    // ctxSize=1024, promptTokens=256 → 1024 - 256 - 256 = 512.
    expect(computeDefaultMaxTokens(1_024, 256)).toBe(OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS);
  });
});
