import type { CapabilityClass } from '../../../common/enums/capability-class.enum';
import type { CapabilityOperation } from '../../../common/enums/capability-operation.enum';

/**
 * Typed recipe DSL shapes (Stream 13).
 *
 * Validated at create-time via the Zod schema in
 * src/modules/recipes/dto/recipe-dsl.dto.ts.  Steps reference each other
 * by `id`; `when` and target/payload values may include the safe
 * expression evaluator's syntax `$params.<name>` and
 * `$steps.<id>.output.<dot.path>` — see
 * src/common/utilities/recipe-expression.utility.ts.
 */
export type RecipeStep = {
  id: string;
  name?: string;
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  target: Record<string, unknown>;
  payload?: Record<string, unknown>;
  when?: string;
  on_success?: string[];
  on_error?: 'abort' | 'continue' | { retry: { maxAttempts: number; backoffMs: number } } | { fallback: string };
  parallel_group?: string;
  timeout_ms?: number;
};

export type RecipeParameter = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'path' | 'select' | 'date';
  label: string;
  required: boolean;
  default?: unknown;
  options?: string[];
};

export type RecipeMetadata = {
  title: string;
  description?: string;
  icon?: string;
  tags?: string[];
};

export type RecipeDsl = {
  schemaVersion: '1';
  metadata: RecipeMetadata;
  parameters?: RecipeParameter[];
  steps: RecipeStep[];
};

// Run + step status enums are owned by Prisma (`RecipeRunStatus`,
// `RecipeRunStepStatus` in schema.prisma). Import them from
// `src/generated/prisma` — do NOT redeclare here. Earlier local aliases
// drifted (used `COMPLETED`/`ROLLED_BACK` vs Prisma's `SUCCEEDED`/`TIMED_OUT`)
// and were deleted 2026-05-24.
