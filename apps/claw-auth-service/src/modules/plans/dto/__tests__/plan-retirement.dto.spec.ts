import {
  pendingRetirementMigrationSchema,
  retirementMigrationOutcomeSchema,
  retirementMigrationQuerySchema,
  retirePlanSchema,
} from '../plan-retirement.dto';

describe('plan retirement DTOs', () => {
  it('bounds pending migration batches', () => {
    expect(retirementMigrationQuerySchema.safeParse({ limit: '100' }).success).toBe(true);
    expect(retirementMigrationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('only accepts terminal payment-service outcomes', () => {
    expect(
      retirementMigrationOutcomeSchema.safeParse({ status: 'BILLING_SCHEDULED' }).success,
    ).toBe(true);
    expect(retirementMigrationOutcomeSchema.safeParse({ status: 'APPLIED' }).success).toBe(false);
  });

  it('allows deterministic replacement or an explicit override', () => {
    const absentBody: unknown = undefined;
    expect(retirePlanSchema.parse(absentBody)).toEqual({});
    expect(retirePlanSchema.parse({ replacementPlanId: 'plan-pro' })).toEqual({
      replacementPlanId: 'plan-pro',
    });
  });

  it('requires the auth-derived replacement slug in the payment contract', () => {
    expect(
      pendingRetirementMigrationSchema.safeParse({
        id: 'migration-1',
        userId: 'user-1',
        sourcePlanId: 'plan-old',
        replacementPlanId: 'plan-pro',
        sourceSubscriptionId: 'subscription-1',
      }).success,
    ).toBe(false);
  });
});
