import { PlanFeatureKey } from '../../../generated/prisma';

export const THREAD_JOB_REQUIRED_FEATURES = [
  PlanFeatureKey.RESEARCH_MODE,
  PlanFeatureKey.JUDGE_MODE,
  PlanFeatureKey.CRITIC_REVIEW,
] as const;

/** The code a caller can match on when the budget is only momentarily busy (HTTP 503). */
export const THREAD_BUDGET_BUSY_CODE = 'THREAD_BUDGET_BUSY';
