import {
  pendingPlanRetirementMigrationsSchema,
  planRetirementOutcomeResponseSchema,
} from '../plan-retirement.schema';

const MIGRATION = {
  id: 'migration-1',
  userId: 'user-1',
  sourcePlanId: 'plan-old',
  replacementPlanId: 'plan-new',
  replacementPlanSlug: 'new',
  sourceSubscriptionId: 'subscription-1',
};

describe('plan retirement internal API schemas', () => {
  it('accepts a bounded valid pending response', () => {
    expect(pendingPlanRetirementMigrationsSchema.parse([MIGRATION])).toEqual([MIGRATION]);
  });

  it('rejects an unbounded or malformed pending response', () => {
    expect(() =>
      pendingPlanRetirementMigrationsSchema.parse(Array.from({ length: 101 }, () => MIGRATION)),
    ).toThrow();
    expect(() =>
      pendingPlanRetirementMigrationsSchema.parse([{ ...MIGRATION, userId: '' }]),
    ).toThrow();
  });

  it('requires the pending-only CAS result shape', () => {
    expect(planRetirementOutcomeResponseSchema.parse({ applied: true })).toEqual({ applied: true });
    expect(() => planRetirementOutcomeResponseSchema.parse({ applied: 'yes' })).toThrow();
  });
});
