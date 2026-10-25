import { ThreadFailureClass, ThreadHealingStrategy } from '@claw/shared-types';

import {
  COMPACT_OUTPUT_NOTE,
  LOWER_LIMIT_NOTE,
  SHRINK_SOURCE_NOTE,
  STRICT_PROMPT_NOTE,
} from '../constants/healing-notes.constants';
import {
  LOWERED_OUTPUT_FACTOR,
  MIN_LOWERED_OUTPUT_TOKENS,
  NO_WAIT_MS,
  ON_MODEL_LADDERS,
} from '../constants/healing.constants';
import { TRUNCATION_NOTE } from '../constants/output-retry.constants';
import { REPAIR_NOTE_LEAD } from '../constants/generation.constants';
import type { LadderState, OnModelStep } from '../types/healing.types';
import { backoffDelayMs } from './backoff-delay.utility';

function buildStep(
  strategy: ThreadHealingStrategy,
  state: LadderState,
  random: () => number,
): OnModelStep | null {
  const base = {
    strategy,
    maxOutputTokens: state.currentMaxOutputTokens,
    note: '',
    delayMs: NO_WAIT_MS,
    shrinkSource: false,
    repairPass: false,
  };
  switch (strategy) {
    case ThreadHealingStrategy.BACKOFF_RETRY: {
      const delayMs = backoffDelayMs(state.waits, state.retryAfterMs, random);
      return delayMs === null ? null : { ...base, delayMs };
    }
    case ThreadHealingStrategy.STRICT_PROMPT:
      return { ...base, note: `${REPAIR_NOTE_LEAD}${state.reason}${STRICT_PROMPT_NOTE}` };
    case ThreadHealingStrategy.JSON_REPAIR:
      return { ...base, repairPass: true };
    case ThreadHealingStrategy.RAISE_OUTPUT_LIMIT:
      return {
        ...base,
        maxOutputTokens: Math.max(state.raisedMaxOutputTokens, state.currentMaxOutputTokens),
        note: TRUNCATION_NOTE,
      };
    case ThreadHealingStrategy.COMPACT_OUTPUT:
      return {
        ...base,
        maxOutputTokens: Math.max(state.raisedMaxOutputTokens, state.currentMaxOutputTokens),
        note: COMPACT_OUTPUT_NOTE,
      };
    case ThreadHealingStrategy.LOWER_OUTPUT_LIMIT: {
      const lowered = Math.max(
        MIN_LOWERED_OUTPUT_TOKENS,
        Math.floor(state.currentMaxOutputTokens * LOWERED_OUTPUT_FACTOR),
      );
      // Nothing left to lower: this rung would repeat the same request.
      return lowered >= state.currentMaxOutputTokens
        ? null
        : { ...base, maxOutputTokens: lowered, note: LOWER_LIMIT_NOTE };
    }
    case ThreadHealingStrategy.SHRINK_SOURCE:
      return { ...base, shrinkSource: true, note: SHRINK_SOURCE_NOTE };
    case ThreadHealingStrategy.TEAM_FALLBACK:
    case ThreadHealingStrategy.CROSS_PROVIDER:
    case ThreadHealingStrategy.SAFE_DEFAULT:
      return null;
  }
}

/**
 * The next thing to change on the SAME model after a failure, or null when its rungs are spent
 * (the role then swaps model). Each rung is used once per model, in the class's order, and a rung
 * that would repeat the identical request (an output limit that cannot go lower, a Retry-After
 * longer than we wait) is skipped. Pure: `random` is injected for the backoff jitter.
 */
export function nextOnModelStep(
  state: LadderState,
  random: () => number = Math.random,
): OnModelStep | null {
  if (state.failureClass === ThreadFailureClass.PROVIDER_REJECTED && state.httpStatus === 404) {
    return null;
  }
  for (const strategy of ON_MODEL_LADDERS.get(state.failureClass) ?? []) {
    if (state.used.has(strategy)) continue;
    const step = buildStep(strategy, state, random);
    if (step !== null) return step;
  }
  return null;
}
