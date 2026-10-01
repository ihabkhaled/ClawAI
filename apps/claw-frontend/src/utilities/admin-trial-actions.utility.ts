import { PLAN_TRIAL_MAX_DAYS, PLAN_TRIAL_MIN_DAYS } from '@/constants/plan.constants';
import type { PlanView } from '@/types/plan.types';

/** A whole number of days in 1..3650 typed into a field, or null when it is not one. */
export function parseTrialActionDays(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const days = Number(trimmed);
  return Number.isInteger(days) && days >= PLAN_TRIAL_MIN_DAYS && days <= PLAN_TRIAL_MAX_DAYS
    ? days
    : null;
}

/** Translation key of the first problem with a reasoned-days form, or null when it is valid. */
export function resolveTrialActionErrorKey(daysText: string, reason: string): string | null {
  if (parseTrialActionDays(daysText) === null) {
    return 'admin.assignPlanDurationDaysInvalid';
  }
  return reason.trim().length === 0 ? 'admin.assignPlanReasonRequired' : null;
}

/**
 * The plan "Set to Free for N days" grants: the active trial plan, preferring the
 * signup default. Null when no trial plan is configured, in which case the action
 * is not offered rather than guessing a slug.
 */
export function resolveFreeTrialPlan(plans: PlanView[]): PlanView | null {
  const trialPlans = plans.filter((plan) => plan.isTrial && plan.isActive);
  return trialPlans.find((plan) => plan.isDefault) ?? trialPlans[0] ?? null;
}
