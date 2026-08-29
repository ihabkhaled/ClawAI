import { z } from 'zod';

// Mirror of apps/claw-auth-service plan DTOs. Numeric inputs arrive as strings
// from controlled inputs; optional numerics are blank strings → undefined.
// Safe slug pattern (character classes only, no nested quantifiers) per the
// ReDoS lint rule.
const PLAN_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const NAME_MAX = 128;
const SLUG_MAX = 64;
const DESCRIPTION_MAX = 1000;

// Blank controlled-input strings collapse to undefined before coercion so an
// empty numeric field is treated as "omitted" rather than coerced to 0.
const blankToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? undefined : value;

const optionalNonNegativeInt = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(0).optional(),
);

export const createPlanSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(SLUG_MAX, `Slug must be at most ${SLUG_MAX} characters`)
    .regex(PLAN_SLUG, 'Slug must be kebab-case'),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
    .optional(),
  displayOrder: optionalNonNegativeInt,
  isPublic: z.boolean().optional(),
  isTrial: z.boolean(),
  trialDurationDays: z.union([z.literal(30), z.null()]),
  dailyTokenQuota: z.coerce.number().int().min(0, 'Daily token quota must be 0 or greater'),
  weeklyTokenQuota: optionalNonNegativeInt,
  monthlyTokenQuota: optionalNonNegativeInt,
  // The monthly connector credit, in integer micro-USD (ADR-078 promoted this
  // from a hidden margin control). Integer-only: it is money, and a fractional
  // micro-dollar is not a thing the wallet can hold. Blank means "leave the
  // plan's current allowance alone"; an explicit 0 disables PAYG on the plan.
  monthlyProviderCostCeilingMicroUsd: optionalNonNegativeInt,
  maxChatsPerDay: optionalNonNegativeInt,
  maxMessagesPerDay: optionalNonNegativeInt,
  maxWorkspaceConnections: optionalNonNegativeInt,
  maxContextPacks: optionalNonNegativeInt,
  maxMemoryItems: optionalNonNegativeInt,
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
});

export type CreatePlanForm = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial();

export type UpdatePlanForm = z.infer<typeof updatePlanSchema>;
