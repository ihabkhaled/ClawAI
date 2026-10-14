import { MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT } from '../constants/healing.constants';
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
