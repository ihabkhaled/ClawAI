import type { CapabilityClass, CapabilityOperation } from '../enums';
import type { RecipeOnErrorAction } from '../enums/recipe-on-error-action.enum';
import type { RecipeParameterType } from '../enums/recipe-parameter-type.enum';
import type { RecipeRunStatus } from '../enums/recipe-run-status.enum';
import type { RecipeRunStepStatus } from '../enums/recipe-run-step-status.enum';

export type RecipeStep = {
  id: string;
  name?: string;
  capabilityClass: CapabilityClass;
  capabilityOperation: CapabilityOperation;
  target: Record<string, unknown>;
  payload?: Record<string, unknown>;
  when?: string;
  on_success?: string[];
  on_error?:
    | RecipeOnErrorAction
    | { retry: { maxAttempts: number; backoffMs: number } }
    | { fallback: string };
  parallel_group?: string;
  timeout_ms?: number;
};

export type RecipeParameter = {
  name: string;
  type: RecipeParameterType;
  label: string;
  required: boolean;
  default?: unknown;
  options?: string[];
};

export type RecipeDsl = {
  schemaVersion: '1';
  metadata: {
    title: string;
    description?: string;
    icon?: string;
    tags?: string[];
  };
  parameters?: RecipeParameter[];
  steps: RecipeStep[];
};

export type Recipe = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  dsl: RecipeDsl;
  isEnabled: boolean;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipeRequest = {
  name: string;
  description?: string;
  dsl: RecipeDsl;
  isEnabled?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateRecipeRequest = Partial<CreateRecipeRequest>;

export type ListRecipesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  isEnabled?: boolean;
};

export type PaginatedRecipes = {
  data: Recipe[];
  total: number;
  page: number;
  pageSize: number;
};

export type RecipeRun = {
  id: string;
  recipeId: string;
  userId: string;
  deviceId: string;
  status: RecipeRunStatus;
  params: Record<string, unknown>;
  // V2 Stream 01e — true when this run is a dry-run (no real capabilities invoked)
  dryRun: boolean;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeRunStep = {
  id: string;
  recipeRunId: string;
  stepId: string;
  stepIndex: number;
  status: RecipeRunStepStatus;
  invocationId: string | null;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeRunDetail = RecipeRun & { steps: RecipeRunStep[] };

export type StartRunRequest = {
  deviceId: string;
  params?: Record<string, unknown>;
  /**
   * V2 Stream 01e — dry-run mode. When true, the backend runner walks
   * the DAG, resolves $params and $steps.<id>.output placeholders,
   * and marks every step SUCCEEDED with a synthesised output
   * `{ dryRun: true, target, payload }` instead of calling the
   * capability framework. No CapabilityInvocation rows are created.
   * Default: false (real run).
   */
  dryRun?: boolean;
};

export type ListRunsQuery = {
  page?: number;
  pageSize?: number;
};

export type PaginatedRecipeRuns = {
  data: RecipeRun[];
  total: number;
  page: number;
  pageSize: number;
};
