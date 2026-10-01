import { z } from 'zod';
import { PLAN_TRIAL_MAX_DAYS, PLAN_TRIAL_MIN_DAYS } from '../constants/plan-trial.constants';

/** A whole number of days, 1 to 3650. The one definition of "a valid trial length". */
export const trialDaysSchema = z.number().int().min(PLAN_TRIAL_MIN_DAYS).max(PLAN_TRIAL_MAX_DAYS);

export const addTrialDaysSchema = z.object({
  days: trialDaysSchema,
  reason: z.string().trim().min(1).max(500),
});
export type AddTrialDaysDto = z.infer<typeof addTrialDaysSchema>;
