import { type RuntimeProgressStage } from '@claw/shared-types';

/**
 * Per-stage timing measurement. `durationMs` must be a non-negative finite
 * number; entries with negative or non-finite durations are skipped by
 * {@link findBottleneck} to avoid polluting the percentage calculation.
 */
export type StageTiming = {
  stage: RuntimeProgressStage;
  durationMs: number;
};

/**
 * Result returned by {@link findBottleneck}. `percentOfTotal` is expressed
 * as a fraction in `[0, 1]` so it can be multiplied by 100 for display or
 * used directly in progress bars. The fraction is computed against the sum
 * of all valid stage durations in the input.
 */
export type BottleneckResult = {
  stage: RuntimeProgressStage;
  durationMs: number;
  percentOfTotal: number;
};

/**
 * Identify the slowest stage from a list of {@link StageTiming}
 * measurements. Returns `null` when the input list is empty or every entry
 * has a non-positive duration (no stage actually consumed time).
 *
 * Ties are broken by input order — the first stage with the maximum
 * duration wins. This produces stable, deterministic output across
 * repeated invocations on the same input.
 */
export function findBottleneck(stages: ReadonlyArray<StageTiming>): BottleneckResult | null {
  if (!Array.isArray(stages) || stages.length === 0) {
    return null;
  }

  const valid = stages.filter(
    (s) => typeof s.durationMs === 'number' && Number.isFinite(s.durationMs) && s.durationMs >= 0,
  );
  if (valid.length === 0) {
    return null;
  }

  const total = valid.reduce((sum, s) => sum + s.durationMs, 0);
  if (total <= 0) {
    return null;
  }

  let slowest = valid[0];
  if (slowest === undefined) {
    return null;
  }
  for (let i = 1; i < valid.length; i += 1) {
    const current = valid[i];
    if (current !== undefined && current.durationMs > slowest.durationMs) {
      slowest = current;
    }
  }

  return {
    stage: slowest.stage,
    durationMs: slowest.durationMs,
    percentOfTotal: slowest.durationMs / total,
  };
}
