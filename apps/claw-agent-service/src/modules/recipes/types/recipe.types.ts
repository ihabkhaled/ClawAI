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

export type RecipeRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ROLLED_BACK'
  | 'ROLLBACK_PARTIAL';

export type RecipeStepRecord = {
  stepId: string;
  invocationId: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  errorMessage?: string;
  attempt: number;
};

export type RecipeRunSummary = {
  id: string;
  recipeId: string;
  runByUserId: string;
  status: RecipeRunStatus;
  parameters: Record<string, unknown>;
  steps: RecipeStepRecord[];
  startedAt: string;
  completedAt?: string;
};
