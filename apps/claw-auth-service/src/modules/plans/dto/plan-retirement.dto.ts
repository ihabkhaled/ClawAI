import { z } from 'zod';
import { PlanRetirementMigrationStatus } from '../../../generated/prisma';

export const retirementMigrationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const retirePlanSchema = z
  .object({ replacementPlanId: z.string().trim().min(1).max(64).optional() })
  .default({});

export const retirementMigrationOutcomeSchema = z.object({
  status: z.enum([
    PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    PlanRetirementMigrationStatus.SUPERSEDED,
    PlanRetirementMigrationStatus.FAILED,
  ]),
  errorCode: z.string().trim().min(1).max(100).optional(),
});

export const pendingRetirementMigrationSchema = z.object({
  id: z.string().min(1).max(64),
  userId: z.string().min(1).max(64),
  sourcePlanId: z.string().min(1).max(64),
  replacementPlanId: z.string().min(1).max(64),
  replacementPlanSlug: z.string().min(1).max(100),
  sourceSubscriptionId: z.string().min(1).max(100),
});

export const pendingRetirementMigrationsSchema = z.array(pendingRetirementMigrationSchema).max(100);

export type RetirementMigrationQueryDto = z.infer<typeof retirementMigrationQuerySchema>;
export type RetirementMigrationOutcomeDto = z.infer<typeof retirementMigrationOutcomeSchema>;
export type RetirePlanDto = z.infer<typeof retirePlanSchema>;
