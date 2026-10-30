import { createPlanSchema } from '../create-plan.dto';
import { updatePlanSchema } from '../update-plan.dto';

// ADR-197: per-call limits on a platform-paid call. null = no cap, 0 = refuse every call.
const FIELDS = [
  'maxInputTokensPerCall',
  'maxOutputTokensPerCall',
  'maxCostPerCallMicroUsd',
] as const;
const create = (extra: Record<string, unknown>) =>
  createPlanSchema.safeParse({ name: 'Plan', slug: 'plan', dailyTokenQuota: 1, ...extra });

describe.each(FIELDS)('%s DTO', (field) => {
  it.each([0, 1, 4096])('accepts %i on create and update', (value) => {
    expect(create({ [field]: value }).success).toBe(true);
    expect(updatePlanSchema.safeParse({ [field]: value }).success).toBe(true);
  });

  it('accepts null (no cap) and omission', () => {
    expect(create({ [field]: null }).success).toBe(true);
    expect(updatePlanSchema.safeParse({ [field]: null }).success).toBe(true);
    expect(create({}).data?.[field]).toBeUndefined();
  });

  it.each([-1, 1.5, '12', Number.NaN])('rejects %s', (value) => {
    expect(create({ [field]: value }).success).toBe(false);
    expect(updatePlanSchema.safeParse({ [field]: value }).success).toBe(false);
  });
});
