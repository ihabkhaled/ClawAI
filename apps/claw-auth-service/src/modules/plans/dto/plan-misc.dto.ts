import { z } from 'zod';

export const reorderPlansSchema = z.object({
  orderedIds: z.array(z.string().min(1).max(64)).min(1).max(200),
});
export type ReorderPlansDto = z.infer<typeof reorderPlansSchema>;

export const assignPlanSchema = z.object({
  planId: z.string().min(1).max(64),
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
