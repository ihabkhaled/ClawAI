import { ThreadFailureClass, ThreadHealingStrategy } from '@claw/shared-types';

import {
  HEAL_BACKOFF_BASE_MS,
  HEAL_RETRY_AFTER_MAX_MS,
  MIN_LOWERED_OUTPUT_TOKENS,
} from '../../constants/healing.constants';
import type { LadderState } from '../../types/healing.types';
import { backoffDelayMs } from '../backoff-delay.utility';
import { nextOnModelStep } from '../healing-ladder.utility';

const state = (overrides: Partial<LadderState>): LadderState => ({
  failureClass: ThreadFailureClass.WRONG_SHAPE,
  used: new Set(),
  baseMaxOutputTokens: 8192,
  currentMaxOutputTokens: 8192,
  retryAfterMs: null,
  httpStatus: null,
  waits: 0,
  reason: 'WRONG_SHAPE: citations',
  raisedMaxOutputTokens: 12_288,
  ...overrides,
});

const noJitter = (): number => 0.5;

describe('nextOnModelStep (ADR-181 ladder)', () => {
  it('walks a wrong-shape reply through a stricter prompt, then a repair pass, then gives up on the model', () => {
    const first = nextOnModelStep(state({}));
    expect(first?.strategy).toBe(ThreadHealingStrategy.STRICT_PROMPT);
    expect(first?.note).toContain('WRONG_SHAPE: citations');
    const second = nextOnModelStep(state({ used: new Set([ThreadHealingStrategy.STRICT_PROMPT]) }));
    expect(second).toMatchObject({ strategy: ThreadHealingStrategy.JSON_REPAIR, repairPass: true });
    const spent = new Set([ThreadHealingStrategy.STRICT_PROMPT, ThreadHealingStrategy.JSON_REPAIR]);
    expect(nextOnModelStep(state({ used: spent }))).toBeNull();
  });

  it('gives a cut-off reply more room, then asks for a shorter article', () => {
    const cut = state({ failureClass: ThreadFailureClass.TRUNCATED_OUTPUT });
    const raise = nextOnModelStep(cut);
    expect(raise).toMatchObject({
      strategy: ThreadHealingStrategy.RAISE_OUTPUT_LIMIT,
      maxOutputTokens: 12_288,
    });
    const compact = nextOnModelStep({
      ...cut,
      used: new Set([ThreadHealingStrategy.RAISE_OUTPUT_LIMIT]),
      currentMaxOutputTokens: 12_288,
      raisedMaxOutputTokens: 18_432,
    });
    expect(compact).toMatchObject({ strategy: ThreadHealingStrategy.COMPACT_OUTPUT });
    expect(compact?.note).toContain('shorter');
  });

  it('waits with backoff for a rate limit and honours a short Retry-After', () => {
    const limited = state({ failureClass: ThreadFailureClass.PROVIDER_RATE_LIMITED });
    expect(nextOnModelStep(limited, noJitter)).toMatchObject({
      strategy: ThreadHealingStrategy.BACKOFF_RETRY,
      delayMs: HEAL_BACKOFF_BASE_MS,
    });
    expect(nextOnModelStep({ ...limited, retryAfterMs: 4000 }, noJitter)?.delayMs).toBe(4000);
  });

  it('does not wait out a Retry-After longer than the limit: the role swaps model instead', () => {
    const limited = state({
      failureClass: ThreadFailureClass.PROVIDER_RATE_LIMITED,
      retryAfterMs: HEAL_RETRY_AFTER_MAX_MS + 1,
    });
    expect(nextOnModelStep(limited)).toBeNull();
  });

  it('retries a server error once after a wait, then swaps', () => {
    const down = state({ failureClass: ThreadFailureClass.PROVIDER_UNAVAILABLE });
    expect(nextOnModelStep(down, noJitter)?.strategy).toBe(ThreadHealingStrategy.BACKOFF_RETRY);
    expect(
      nextOnModelStep({ ...down, used: new Set([ThreadHealingStrategy.BACKOFF_RETRY]) }),
    ).toBeNull();
  });

  it('swaps at once after a timeout: the same model would stall the same way', () => {
    expect(
      nextOnModelStep(state({ failureClass: ThreadFailureClass.PROVIDER_TIMEOUT })),
    ).toBeNull();
  });

  it('lowers the output limit for a provider rejection, never below the floor, and never repeats an identical request', () => {
    const rejected = state({ failureClass: ThreadFailureClass.PROVIDER_REJECTED });
    expect(nextOnModelStep(rejected)).toMatchObject({
      strategy: ThreadHealingStrategy.LOWER_OUTPUT_LIMIT,
      maxOutputTokens: 4096,
    });
    // Nothing left to lower: the next rung is a shorter source, never the identical request.
    const floor = { ...rejected, currentMaxOutputTokens: MIN_LOWERED_OUTPUT_TOKENS };
    expect(nextOnModelStep(floor)?.strategy).toBe(ThreadHealingStrategy.SHRINK_SOURCE);
    const spent = new Set([ThreadHealingStrategy.SHRINK_SOURCE]);
    expect(nextOnModelStep({ ...floor, used: spent })).toBeNull();
    expect(nextOnModelStep({ ...rejected, currentMaxOutputTokens: 1024, used: spent })).toBeNull();
  });

  it('skips same-model retries when the provider says the model does not exist', () => {
    expect(
      nextOnModelStep(
        state({ failureClass: ThreadFailureClass.PROVIDER_REJECTED, httpStatus: 404 }),
      ),
    ).toBeNull();
  });

  it('shrinks the source for a window overflow', () => {
    expect(
      nextOnModelStep(state({ failureClass: ThreadFailureClass.CONTEXT_OVERFLOW })),
    ).toMatchObject({ strategy: ThreadHealingStrategy.SHRINK_SOURCE, shrinkSource: true });
  });

  it.each([
    ThreadFailureClass.CREDIT_EXHAUSTED,
    ThreadFailureClass.REFUSAL,
    ThreadFailureClass.ENTITLEMENT,
    ThreadFailureClass.PRICING_UNAVAILABLE,
    ThreadFailureClass.PROVIDER_CREDIT,
    ThreadFailureClass.REVIEW_NOT_PASSED,
  ])('has no same-model rung for %s', (failureClass) => {
    expect(nextOnModelStep(state({ failureClass }))).toBeNull();
  });
});

describe('backoffDelayMs', () => {
  it('doubles from the base and caps', () => {
    expect(backoffDelayMs(0, null, () => 0.5)).toBe(2000);
    expect(backoffDelayMs(1, null, () => 0.5)).toBe(4000);
    expect(backoffDelayMs(2, null, () => 0.5)).toBe(8000);
    expect(backoffDelayMs(10, null, () => 0.5)).toBe(30_000);
  });

  it('spreads parallel callers with jitter inside the quarter band', () => {
    expect(backoffDelayMs(0, null, () => 0)).toBe(1500);
    expect(backoffDelayMs(0, null, () => 1)).toBe(2500);
  });

  it('uses Retry-After over the exponential value and refuses a longer one', () => {
    expect(backoffDelayMs(3, 1200)).toBe(1200);
    expect(backoffDelayMs(0, 31_000)).toBeNull();
    expect(backoffDelayMs(0, 0)).toBe(0);
  });
});
