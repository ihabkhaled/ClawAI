import { z } from 'zod';

import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { RiskLabel } from '@/enums/risk-label.enum';

// Mirror of apps/claw-workspace-service src/modules/ai-actions/dto/ai-action-policy.dto.ts
// Names follow kebab-case; descriptions/regexes are length-bounded;
// riskMaxScore is a 0..100 integer.
// Safe alternative to /^[a-z0-9]+(?:-[a-z0-9]+)*$/ which the linter flags as
// nested-quantifier ReDoS-vulnerable. This pattern uses character classes only
// and avoids backtracking by anchoring with start/end and using greedy
// non-overlapping branches.
const KEBAB_CASE_NAME = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const REGEX_FIELD_MAX = 256;

export const createAiActionPolicySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(128, 'Name must be at most 128 characters')
    .regex(KEBAB_CASE_NAME, 'Name must be kebab-case'),
  kind: z.nativeEnum(AiActionPolicyKind),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  providerRegex: z
    .string()
    .min(1, 'Provider regex is required')
    .max(REGEX_FIELD_MAX, `Provider regex must be at most ${REGEX_FIELD_MAX} characters`),
  actionKindRegex: z
    .string()
    .min(1, 'Action-kind regex is required')
    .max(REGEX_FIELD_MAX, `Action-kind regex must be at most ${REGEX_FIELD_MAX} characters`),
  riskMaxLabel: z.nativeEnum(RiskLabel),
  riskMaxScore: z.coerce.number().int().min(0).max(100),
  priority: z.coerce.number().int().min(0).max(10000),
  requireReason: z.boolean(),
  isActive: z.boolean(),
});

export type CreateAiActionPolicyForm = z.infer<typeof createAiActionPolicySchema>;

export const updateAiActionPolicySchema = createAiActionPolicySchema.omit({ name: true }).partial();

export type UpdateAiActionPolicyForm = z.infer<typeof updateAiActionPolicySchema>;

const EVENT_TYPE_MAX = 64;
const ACTION_KIND_MAX = 64;

export const createSuggestionRuleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(128, 'Name must be at most 128 characters')
    .regex(KEBAB_CASE_NAME, 'Name must be kebab-case'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  eventType: z.string().min(1, 'Event type is required').max(EVENT_TYPE_MAX),
  providerRegex: z.string().max(REGEX_FIELD_MAX).optional(),
  contentRegex: z.string().max(REGEX_FIELD_MAX).optional(),
  actionKindToSuggest: z.string().min(1, 'Action kind is required').max(ACTION_KIND_MAX),
  priority: z.coerce.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSuggestionRuleForm = z.infer<typeof createSuggestionRuleSchema>;

export const updateSuggestionRuleSchema = createSuggestionRuleSchema.omit({ name: true }).partial();

export type UpdateSuggestionRuleForm = z.infer<typeof updateSuggestionRuleSchema>;
