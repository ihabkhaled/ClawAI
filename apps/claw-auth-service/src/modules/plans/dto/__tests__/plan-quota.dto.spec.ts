import { createPlanSchema } from '../create-plan.dto';
import { updatePlanSchema } from '../update-plan.dto';

describe('plan quota DTOs', () => {
  it('preserves a finite weekly token quota on create', () => {
    const result = createPlanSchema.parse({
      name: 'Free',
      slug: 'free',
      dailyTokenQuota: 300_000,
      weeklyTokenQuota: 20_000,
      isTrial: false,
      trialDurationDays: null,
    });

    expect(result.weeklyTokenQuota).toBe(20_000);
  });

  it.each([-1, 1.5, 1_000_000_001])('rejects invalid weekly token quota %s', (value) => {
    const result = updatePlanSchema.safeParse({ weeklyTokenQuota: value });

    expect(result.success).toBe(false);
  });
});
