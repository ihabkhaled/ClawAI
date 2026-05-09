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
