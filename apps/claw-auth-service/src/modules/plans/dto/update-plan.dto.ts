import { z } from 'zod';
import { trialDaysSchema } from './plan-trial.dto';

export const updatePlanSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional(),
    displayOrder: z.number().int().min(0).max(10_000).optional(),
    isPublic: z.boolean().optional(),
    isTrial: z.boolean().optional(),
    trialDurationDays: trialDaysSchema.nullable().optional(),
    dailyTokenQuota: z.number().int().min(0).max(1_000_000_000).optional(),
    weeklyTokenQuota: z.number().int().min(0).max(1_000_000_000).optional(),
    monthlyTokenQuota: z.number().int().min(0).max(1_000_000_000).optional(),
    maxChatsPerDay: z.number().int().min(0).max(1_000_000).optional(),
    maxMessagesPerDay: z.number().int().min(0).max(1_000_000).optional(),
    maxWorkspaceConnections: z.number().int().min(0).max(10_000).optional(),
    maxContextPacks: z.number().int().min(0).max(100_000).optional(),
    maxMemoryItems: z.number().int().min(0).max(1_000_000).optional(),
    allowCompareMode: z.boolean().optional(),
    allowJudgeMode: z.boolean().optional(),
    allowResearchMode: z.boolean().optional(),
    allowCriticReview: z.boolean().optional(),
    allowWorkspaces: z.boolean().optional(),
    allowMemory: z.boolean().optional(),
    allowContextPacks: z.boolean().optional(),
    allowConsensusMode: z.boolean().optional(),
    allowEscalationChain: z.boolean().optional(),
    allowRepairLab: z.boolean().optional(),
    allowTaskDecomposer: z.boolean().optional(),
    allowBestOfN: z.boolean().optional(),
    allowVerifier: z.boolean().optional(),
    allowPipelineLab: z.boolean().optional(),
    allowCostEnsemble: z.boolean().optional(),
    allowRolePack: z.boolean().optional(),
    allowImageGeneration: z.boolean().optional(),
    allowHelperVision: z.boolean().optional(),
    allowTextToSpeech: z.boolean().optional(),
    // null = unlimited, 0 = video disabled (ADR-122). Ten hours is the bound.
    maxVideoSeconds: z.number().int().min(0).max(36_000).nullable().optional(),
  })
  .refine(
    (value) => {
      // Without isTrial the length alone may change (a number); the service
      // checks it against the stored plan. `null` needs isTrial: false.
      if (value.isTrial === undefined) return value.trialDurationDays !== null;
      return value.isTrial
        ? typeof value.trialDurationDays === 'number'
        : value.trialDurationDays === null;
    },
    {
      message: 'Trial plans need a length of 1 to 3650 days; other plans must have none',
      path: ['trialDurationDays'],
    },
  );

export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
