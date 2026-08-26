import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  HARD_MAX_OUTPUT_TOKENS,
} from '../execution-fast-path.constants';
import { RUNTIME_V2_MAX_OUTPUT_TOKENS } from '../runtime-v2-transcript.constants';

/**
 * The runtime lane's cap has to survive the clamp every provider path applies.
 *
 * It did not. `RUNTIME_V2_MAX_OUTPUT_TOKENS` was raised to 32_768 because
 * 16_384 cut agent turns off mid-JSON, and `Math.min(requested,
 * HARD_MAX_OUTPUT_TOKENS)` silently returned it to 16_384 — the exact value the
 * raise existed to escape. Nothing failed; the constant simply had no effect,
 * and the truncation it was meant to fix kept ending runs as UNREPAIRABLE.
 *
 * Two constants in different files have to move together for that not to
 * happen again, which is what this pins.
 */
describe('output token ceiling', () => {
  it('does not clamp the runtime lane below the cap it asks for', () => {
    expect(RUNTIME_V2_MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(HARD_MAX_OUTPUT_TOKENS);
  });

  it('stays a ceiling rather than a default', () => {
    expect(DEFAULT_MAX_OUTPUT_TOKENS).toBeLessThan(HARD_MAX_OUTPUT_TOKENS);
  });
});
