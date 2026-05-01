import { z } from 'zod';

import { AiActionPolicyKind } from '../../../common/enums/ai-action-policy-kind.enum';
import { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import { isPolicyPatternSafe } from '../../../common/utilities/policy-regex.utility';

const safeRegexField = z
  .string()
  .min(1, 'regex required')
  .max(256, 'regex too long')
  .refine(isPolicyPatternSafe, { message: 'POLICY_REGEX_UNSAFE' });

export const createAiActionPolicySchema = z
  .object({
    name: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/, 'kebab-case-only'),
    kind: z.nativeEnum(AiActionPolicyKind),
    description: z.string().max(1000).optional(),
    providerRegex: safeRegexField.default('.*'),
    actionKindRegex: safeRegexField.default('.*'),
    riskMaxLabel: z.nativeEnum(AiActionRiskLabel).default(AiActionRiskLabel.LOW),
    riskMaxScore: z.number().int().min(0).max(100).default(30),
    priority: z.number().int().min(0).max(10000).default(0),
    requireReason: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();

export type CreateAiActionPolicyDto = z.infer<typeof createAiActionPolicySchema>;

export const updateAiActionPolicySchema = createAiActionPolicySchema
  .partial()
  .omit({ name: true })
  .strict();

export type UpdateAiActionPolicyDto = z.infer<typeof updateAiActionPolicySchema>;
