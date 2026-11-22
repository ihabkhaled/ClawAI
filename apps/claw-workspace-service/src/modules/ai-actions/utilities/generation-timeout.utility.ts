import {
  GENERATION_TIMEOUT_MAX_MS,
  GENERATION_TIMEOUT_MIN_MS,
} from '../constants/generation-timeout.constants';

/**
 * Clamps a caller-supplied generation timeout into
 * [GENERATION_TIMEOUT_MIN_MS, GENERATION_TIMEOUT_MAX_MS] so a request can
 * never hold a timer (and the upstream call it guards) open for an arbitrary
 * duration — CodeQL js/resource-exhaustion. A non-finite value takes the
 * ceiling: the call still gets a bounded, generous budget.
 */
export function clampGenerationTimeoutMs(timeoutMs: number): number {
  // An explicit upper-bound comparison (not Math.min) is the guard CodeQL
  // recognises as a barrier for the timer duration.
  if (Number.isFinite(timeoutMs) && timeoutMs <= GENERATION_TIMEOUT_MAX_MS) {
    return timeoutMs < GENERATION_TIMEOUT_MIN_MS ? GENERATION_TIMEOUT_MIN_MS : timeoutMs;
  }
  return GENERATION_TIMEOUT_MAX_MS;
}
