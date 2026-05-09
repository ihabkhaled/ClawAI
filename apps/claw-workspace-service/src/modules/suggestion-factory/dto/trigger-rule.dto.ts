import { z } from 'zod';

import { isPolicyPatternSafe } from '../../../common/utilities/policy-regex.utility';

const safeRegexField = z
  .string()
  .min(1)
  .max(256)
  .refine(isPolicyPatternSafe, { message: 'TRIGGER_REGEX_UNSAFE' });

export const createTriggerRuleSchema = z
  .object({
    name: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/, 'kebab-case-only'),
    description: z.string().max(1000).optional(),
    eventType: z.string().min(1).max(64),
    providerRegex: safeRegexField.default('.*'),
    contentRegex: safeRegexField.default('.*'),
    actionKindToSuggest: z.string().min(1).max(64),
    isActive: z.boolean().default(true),
    priority: z.number().int().min(0).max(10000).default(0),
    // Stream 13.3 v1.1 — null/omitted = unbounded (rely on global env cap).
    perRuleBudgetPerHour: z.number().int().min(1).max(100_000).nullable().optional(),
  })
  .strict();

export type CreateTriggerRuleDto = z.infer<typeof createTriggerRuleSchema>;

export const updateTriggerRuleSchema = createTriggerRuleSchema.partial().omit({ name: true }).strict();

export type UpdateTriggerRuleDto = z.infer<typeof updateTriggerRuleSchema>;
