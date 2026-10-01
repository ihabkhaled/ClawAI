import { PLAN_TRIAL_MS_PER_DAY } from '../constants/plan-trial.constants';

/** The instant `days` whole days after `from`. Absolute time, never calendar walking. */
export function addTrialDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * PLAN_TRIAL_MS_PER_DAY);
}

/**
 * Where an extended trial ends: `days` after whichever is later, the current end
 * or now. Adding to a live trial stacks onto what is left; adding to a lapsed
 * one reopens it for exactly `days` from today instead of for a window that
 * would already be partly or wholly in the past.
 */
export function resolveExtendedTrialEnd(currentEnd: Date, now: Date, days: number): Date {
  const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return addTrialDays(base, days);
}
