import { z } from 'zod';

export const reorderPlansSchema = z.object({
  orderedIds: z.array(z.string().min(1).max(64)).min(1).max(200),
});
export type ReorderPlansDto = z.infer<typeof reorderPlansSchema>;

export const assignPlanSchema = z
  .object({
    planId: z.string().min(1).max(64),
    // Optional at the schema level: a plain trial assignment never uses these.
    // The service layer requires a duration (months OR days) and a reason for
    // any admin grant, with PLAN_GRANT_DURATION_INVALID / PLAN_GRANT_REASON_REQUIRED.
    durationMonths: z.number().int().optional(),
    // Whole days, 1 to 3650. The only unit a trial plan grant uses.
    durationDays: z.number().int().optional(),
    grantReason: z.string().max(500).optional(),
  })
  .refine((value) => value.durationMonths === undefined || value.durationDays === undefined, {
    message: 'Give the grant length in months or in days, not both',
    path: ['durationDays'],
  });
export type AssignPlanDto = z.infer<typeof assignPlanSchema>;

export const planModelAccessRowSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  isAllowed: z.boolean().default(true),
  allowAsPrimary: z.boolean().default(true),
  allowAsFallback: z.boolean().default(true),
  allowAsJudge: z.boolean().default(false),
  allowInCompare: z.boolean().default(true),
  dailyTokenLimitOverride: z.number().int().min(0).max(1_000_000_000).optional(),
});

export const setPlanModelAccessSchema = z.object({
  models: z.array(planModelAccessRowSchema).max(500),
});
export type SetPlanModelAccessDto = z.infer<typeof setPlanModelAccessSchema>;
