import { createPlanSchema } from '../create-plan.dto';
import { updatePlanSchema } from '../update-plan.dto';

const base = { name: 'Trial', slug: 'trial', dailyTokenQuota: 1 };

describe('plan trial DTO invariant', () => {
  it('accepts only a fixed 30-day trial', () => {
    expect(
      createPlanSchema.safeParse({ ...base, isTrial: true, trialDurationDays: 30 }).success,
    ).toBe(true);
    expect(
      createPlanSchema.safeParse({ ...base, isTrial: true, trialDurationDays: 29 }).success,
    ).toBe(false);
    expect(updatePlanSchema.safeParse({ isTrial: false, trialDurationDays: null }).success).toBe(
      true,
    );
    expect(updatePlanSchema.safeParse({ isTrial: false, trialDurationDays: 30 }).success).toBe(
      false,
    );
  });
});
