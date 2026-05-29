import { z } from 'zod';

// Mirror of apps/claw-auth-service plan DTOs. Numeric inputs arrive as strings
// from controlled inputs; optional numerics are blank strings → undefined.
// Safe slug pattern (character classes only, no nested quantifiers) per the
// ReDoS lint rule.
const PLAN_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const NAME_MAX = 128;
const SLUG_MAX = 64;
const DESCRIPTION_MAX = 1000;
const CURRENCY_MAX = 8;

// Blank controlled-input strings collapse to undefined before coercion so an
// empty numeric field is treated as "omitted" rather than coerced to 0.
const blankToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? undefined : value;

const optionalNonNegativeInt = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(0).optional(),
);

const optionalNonNegativeNumber = z.preprocess(
  blankToUndefined,
  z.coerce.number().min(0).optional(),
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
  priceMonthly: optionalNonNegativeNumber,
  priceYearly: optionalNonNegativeNumber,
  currency: z.string().max(CURRENCY_MAX).optional(),
  displayOrder: optionalNonNegativeInt,
  isPublic: z.boolean().optional(),
  dailyTokenQuota: z.coerce.number().int().min(0, 'Daily token quota must be 0 or greater'),
  monthlyTokenQuota: optionalNonNegativeInt,
  maxChatsPerDay: optionalNonNegativeInt,
  maxMessagesPerDay: optionalNonNegativeInt,
  maxWorkspaceConnections: optionalNonNegativeInt,
  maxContextPacks: optionalNonNegativeInt,
  maxMemoryItems: optionalNonNegativeInt,
  allowCompareMode: z.boolean().optional(),
  allowJudgeMode: z.boolean().optional(),
  allowWorkspaces: z.boolean().optional(),
  allowMemory: z.boolean().optional(),
  allowContextPacks: z.boolean().optional(),
});

export type CreatePlanForm = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial();

export type UpdatePlanForm = z.infer<typeof updatePlanSchema>;
