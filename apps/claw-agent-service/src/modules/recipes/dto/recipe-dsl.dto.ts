import { z } from 'zod';

import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityOperation } from '../../../common/enums/capability-operation.enum';
import {
  RECIPE_DSL_SCHEMA_VERSION,
  RECIPE_MAX_STEPS_PER_RUN_DEFAULT,
  RECIPE_PARAM_NAME_PATTERN,
} from '../../../common/constants/recipe.constants';

const stepIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);

const onErrorSchema = z.union([
  z.literal('abort'),
  z.literal('continue'),
  z.object({
    retry: z.object({
      maxAttempts: z.number().int().min(1).max(5),
      backoffMs: z.number().int().min(0).max(60_000),
    }),
  }),
  z.object({
    fallback: stepIdSchema,
  }),
]);

export const recipeStepSchema = z.object({
  id: stepIdSchema,
  name: z.string().max(200).optional(),
  capabilityClass: z.nativeEnum(CapabilityClass),
  capabilityOperation: z.nativeEnum(CapabilityOperation),
  target: z.record(z.string(), z.unknown()),
  payload: z.record(z.string(), z.unknown()).optional(),
  when: z.string().max(500).optional(),
  on_success: z.array(stepIdSchema).max(20).optional(),
  on_error: onErrorSchema.optional(),
  parallel_group: z.string().max(100).optional(),
  timeout_ms: z.number().int().min(100).max(600_000).optional(),
});

const recipeParameterSchema = z.object({
  name: z.string().regex(RECIPE_PARAM_NAME_PATTERN).max(50),
  type: z.enum(['string', 'number', 'boolean', 'path', 'select', 'date']),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  options: z.array(z.string().max(200)).max(50).optional(),
});

export const recipeDslSchema = z.object({
  schemaVersion: z.literal(RECIPE_DSL_SCHEMA_VERSION),
  metadata: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    icon: z.string().max(50).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
  }),
  parameters: z.array(recipeParameterSchema).max(20).optional(),
  steps: z
    .array(recipeStepSchema)
    .min(1)
    .max(RECIPE_MAX_STEPS_PER_RUN_DEFAULT),
});

export type RecipeDslInput = z.infer<typeof recipeDslSchema>;
export type RecipeStepInput = z.infer<typeof recipeStepSchema>;
