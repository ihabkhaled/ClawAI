import { z } from 'zod';
import {
  COST_CLASS_LABELS,
  COST_CONFIDENCE_LABELS,
  LATENCY_CLASS_LABELS,
  PRIVACY_CLASS_LABELS,
  QUALITY_TIER_LABELS,
} from '../constants/model-intelligence.constants';

const nullableBoolean = z.boolean().nullable().optional();
const nullableInt = z
  .number()
  .int()
  .min(0)
  .max(100_000_000)
  .nullable()
  .optional();
const nullableFloat = z.number().min(0).max(1_000_000).nullable().optional();
const stringArray = z.array(z.string().min(1).max(64)).max(50).optional();
const enumLabel = (allowed: ReadonlyArray<string>): z.ZodOptional<z.ZodNullable<z.ZodString>> =>
  z
    .string()
    .min(1)
    .max(32)
    .refine((v) => allowed.includes(v), {
      message: `must be one of: ${allowed.join(', ')}`,
    })
    .nullable()
    .optional();

export const updateModelIntelligenceSchema = z
  .object({
    supportsStreaming: nullableBoolean,
    supportsTools: nullableBoolean,
    supportsStructuredOutput: nullableBoolean,
    supportsVision: nullableBoolean,
    supportsAudioInput: nullableBoolean,
    supportsAudioOutput: nullableBoolean,
    supportsVideoInput: nullableBoolean,
    supportsFileInput: nullableBoolean,
    supportsEmbeddings: nullableBoolean,
    supportsLongContext: nullableBoolean,
    maxContextTokens: nullableInt,
    maxOutputTokensIntel: nullableInt,
    domainStrengths: stringArray,
    roleStrengths: stringArray,
    weakDomains: stringArray,
    bestFor: stringArray,
    avoidFor: stringArray,
    languageStrengths: stringArray,
    qualityTierLabel: enumLabel(QUALITY_TIER_LABELS),
    costClassLabel: enumLabel(COST_CLASS_LABELS),
    costConfidenceLabel: enumLabel(COST_CONFIDENCE_LABELS),
    estimatedInputCostPer1M: nullableFloat,
    estimatedOutputCostPer1M: nullableFloat,
    latencyClassLabel: enumLabel(LATENCY_CLASS_LABELS),
    privacyClassLabel: enumLabel(PRIVACY_CLASS_LABELS),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'at least one field must be provided',
  });

export type UpdateModelIntelligenceDto = z.infer<typeof updateModelIntelligenceSchema>;
