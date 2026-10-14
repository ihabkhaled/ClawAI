import { PlanFeatureKey } from '../../../generated/prisma';

export const THREAD_JOB_REQUIRED_FEATURES = [
  PlanFeatureKey.RESEARCH_MODE,
  PlanFeatureKey.JUDGE_MODE,
  PlanFeatureKey.CRITIC_REVIEW,
] as const;

/** The code a caller can match on when the budget is only momentarily busy (HTTP 503). */
export const THREAD_BUDGET_BUSY_CODE = 'THREAD_BUDGET_BUSY';

/**
 * The code of the 403 that says a plan feature a Thread needs is turned off or its allowance is
 * used up or held. The body also carries `feature`, `used`, `limit` and `window` so a caller can
 * say how much is used and when it frees up.
 */
export const THREAD_ALLOWANCE_UNAVAILABLE_CODE = 'THREAD_ALLOWANCE_UNAVAILABLE';

/** Plain-words name of each plan feature a Thread reserves, for the refusal message. */
export const THREAD_FEATURE_LABELS: ReadonlyMap<string, string> = new Map([
  [PlanFeatureKey.RESEARCH_MODE, 'web research'],
  [PlanFeatureKey.JUDGE_MODE, 'Judge review'],
  [PlanFeatureKey.CRITIC_REVIEW, 'Critic review'],
]);

const FREES_UP_SOONER = 'and frees up sooner if the running generation ends or fails on our side.';

/** When each plan window frees up again, in plain words (the LIFETIME window never renews). */
export const THREAD_WINDOW_RENEWAL_TEXT: ReadonlyMap<string, string> = new Map([
  [
    'LIFETIME',
    'It is for the life of the account, so it only frees up when the running generation ends or fails on our side.',
  ],
  ['BILLING_PERIOD', `It renews with your billing period, ${FREES_UP_SOONER}`],
  ['MONTH', `It renews with your plan month, ${FREES_UP_SOONER}`],
  ['WEEK', `It renews every week, ${FREES_UP_SOONER}`],
  ['DAY', `It renews every day, ${FREES_UP_SOONER}`],
]);

export const THREAD_WINDOW_RENEWAL_FALLBACK_TEXT =
  'It frees up when the running generation ends or fails on our side, and renews with your plan period.';

/**
 * A user can have this many platform-failure refunds (meter money and the lifetime Thread) in a rolling
 * day. Beyond it the failure counts like a finished job, so deliberately failing jobs cannot be turned
 * into unlimited free model calls (security review, 2026-10-14).
 */
export const THREAD_FREE_REFUNDS_PER_DAY = 5;

/** The rolling window those refunds are counted in. */
export const THREAD_FREE_REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;
