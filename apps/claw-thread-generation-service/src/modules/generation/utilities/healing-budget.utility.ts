import {
  HEAL_SPEND_CEILING_PERCENT,
  MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
  PERCENT_DIVISOR,
} from '../constants/healing.constants';
import type { GenerationPipelineInput } from '../types/generation-pipeline.types';
import type { HealingBudget } from '../types/healing.types';

/**
 * The counters that bound healing for one job attempt (ADR-181): a fixed number of healing
 * attempts shared by every role, and the job's cap with what it had already spent, so a heal
 * never starts once most of the cap is gone. A job without a known cap is bounded by attempts only.
 */
export function createHealingBudget(input: GenerationPipelineInput): HealingBudget {
  return {
    jobAttemptsLeft: MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
    spendCapMicroUsd: input.spendCapMicroUsd ?? null,
    spentMicroUsd: input.spentMicroUsd ?? 0,
  };
}

/** True when the job has spent the ceiling share of its cap; a job without a cap is never over. */
export function isOverSpendCeiling(capMicroUsd: number | null, spentMicroUsd: number): boolean {
  return (
    capMicroUsd !== null &&
    spentMicroUsd * PERCENT_DIVISOR >= capMicroUsd * HEAL_SPEND_CEILING_PERCENT
  );
}
