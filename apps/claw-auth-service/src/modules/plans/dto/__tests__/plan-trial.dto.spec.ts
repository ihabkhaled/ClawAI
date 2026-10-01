import { createPlanSchema } from '../create-plan.dto';
import { assignPlanSchema } from '../plan-misc.dto';
import { addTrialDaysSchema } from '../plan-trial.dto';
import { updatePlanSchema } from '../update-plan.dto';

const base = { name: 'Trial', slug: 'trial', dailyTokenQuota: 1 };
const create = (trialDurationDays: number | null, isTrial = true) =>
  createPlanSchema.safeParse({ ...base, isTrial, trialDurationDays }).success;

describe('plan trial DTO invariant', () => {
  it.each([1, 14, 30, 90, 365, 3650])('accepts a %i-day trial', (days) => {
    expect(create(days)).toBe(true);
  });

  it.each([0, -5, 3651, 30.5])('rejects a trial of %d days', (days) => {
    expect(create(days)).toBe(false);
  });

  it('requires a length on a trial plan and none on any other', () => {
    expect(create(null)).toBe(false);
    expect(create(null, false)).toBe(true);
    expect(create(30, false)).toBe(false);
  });

  it('lets an update set any length, alone or with isTrial', () => {
    expect(updatePlanSchema.safeParse({ trialDurationDays: 90 }).success).toBe(true);
    expect(updatePlanSchema.safeParse({ isTrial: true, trialDurationDays: 14 }).success).toBe(true);
    expect(updatePlanSchema.safeParse({ isTrial: true, trialDurationDays: 0 }).success).toBe(false);
    expect(updatePlanSchema.safeParse({ isTrial: true }).success).toBe(false);
    expect(updatePlanSchema.safeParse({ isTrial: false, trialDurationDays: null }).success).toBe(
      true,
    );
    expect(updatePlanSchema.safeParse({ isTrial: false, trialDurationDays: 30 }).success).toBe(
      false,
    );
    expect(updatePlanSchema.safeParse({ trialDurationDays: null }).success).toBe(false);
    expect(updatePlanSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
  });
});

describe('add-trial-days DTO', () => {
  it('needs a whole number of days in range and a reason', () => {
    expect(addTrialDaysSchema.safeParse({ days: 400, reason: 'Support' }).success).toBe(true);
    expect(addTrialDaysSchema.safeParse({ days: 0, reason: 'Support' }).success).toBe(false);
    expect(addTrialDaysSchema.safeParse({ days: 3651, reason: 'Support' }).success).toBe(false);
    expect(addTrialDaysSchema.safeParse({ days: 5, reason: '   ' }).success).toBe(false);
    expect(addTrialDaysSchema.safeParse({ days: 5 }).success).toBe(false);
  });
});

describe('assign-plan DTO duration units', () => {
  it('accepts months or days but not both', () => {
    expect(assignPlanSchema.safeParse({ planId: 'p', durationDays: 90 }).success).toBe(true);
    expect(assignPlanSchema.safeParse({ planId: 'p', durationMonths: 3 }).success).toBe(true);
    expect(
      assignPlanSchema.safeParse({ planId: 'p', durationMonths: 3, durationDays: 90 }).success,
    ).toBe(false);
  });
});
