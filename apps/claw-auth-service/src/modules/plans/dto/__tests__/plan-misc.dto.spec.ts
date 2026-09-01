import { assignPlanSchema } from '../plan-misc.dto';

describe('assignPlanSchema', () => {
  it('accepts a bare planId (the trial-assignment shape)', () => {
    const result = assignPlanSchema.safeParse({ planId: 'plan-free' });
    expect(result.success).toBe(true);
  });

  it('accepts planId with durationMonths and grantReason', () => {
    const result = assignPlanSchema.safeParse({
      planId: 'plan-pro',
      durationMonths: 3,
      grantReason: 'Support gesture for a billing incident',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a grantReason over 500 characters', () => {
    const result = assignPlanSchema.safeParse({
      planId: 'plan-pro',
      durationMonths: 3,
      grantReason: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer durationMonths', () => {
    const result = assignPlanSchema.safeParse({
      planId: 'plan-pro',
      durationMonths: 3.5,
    });
    expect(result.success).toBe(false);
  });
});
