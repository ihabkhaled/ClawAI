import { z } from 'zod';

export const createPlanSchema = z
  .object({
    name: z.string().min(2).max(100),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
    description: z.string().max(1000).optional(),
    displayOrder: z.number().int().min(0).max(10_000).optional(),
    isPublic: z.boolean().optional(),
    isTrial: z.boolean().default(false),
    trialDurationDays: z.number().int().nullable().default(null),
    dailyTokenQuota: z.number().int().min(0).max(1_000_000_000),
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
  })
  .refine(
    (value) => (value.isTrial ? value.trialDurationDays === 30 : value.trialDurationDays === null),
    {
      message: 'Trial plans must have exactly 30 days',
      path: ['trialDurationDays'],
    },
  );

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
