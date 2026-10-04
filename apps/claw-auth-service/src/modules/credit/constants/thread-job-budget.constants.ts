import { PlanFeatureKey } from '../../../generated/prisma';

export const THREAD_JOB_REQUIRED_FEATURES = [
  PlanFeatureKey.RESEARCH_MODE,
  PlanFeatureKey.JUDGE_MODE,
  PlanFeatureKey.CRITIC_REVIEW,
] as const;
