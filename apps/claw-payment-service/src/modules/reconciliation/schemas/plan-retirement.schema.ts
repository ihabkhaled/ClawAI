import { z } from 'zod';

const pendingPlanRetirementMigrationSchema = z.object({
  id: z.string().min(1).max(64),
  userId: z.string().min(1).max(64),
  sourcePlanId: z.string().min(1).max(64),
  replacementPlanId: z.string().min(1).max(64),
  replacementPlanSlug: z.string().min(1).max(100),
  sourceSubscriptionId: z.string().min(1).max(100),
});

export const pendingPlanRetirementMigrationsSchema = z
  .array(pendingPlanRetirementMigrationSchema)
  .max(100);

export const planRetirementOutcomeResponseSchema = z.object({ applied: z.boolean() });
