import { apiClient } from '../../services/shared/api-client';
import type {
  CreateRecipeRequest,
  ListRecipesQuery,
  ListRunsQuery,
  PaginatedRecipeRuns,
  PaginatedRecipes,
  Recipe,
  RecipeRun,
  RecipeRunDetail,
  StartRunRequest,
  UpdateRecipeRequest,
} from '../../types/recipe.types';

const BASE = '/agent/recipes';
const RUNS_BASE = '/agent/recipe-runs';

export async function listRecipes(query?: ListRecipesQuery): Promise<PaginatedRecipes> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {params.set('page', String(query.page));}
  if (query?.pageSize !== undefined) {params.set('pageSize', String(query.pageSize));}
  if (query?.search !== undefined) {params.set('search', query.search);}
  if (query?.isEnabled !== undefined) {params.set('isEnabled', String(query.isEnabled));}
  const qs = params.toString();
  const response = await apiClient.get<PaginatedRecipes>(qs.length > 0 ? `${BASE}?${qs}` : BASE);
  return response.data;
}

export async function getRecipe(id: string): Promise<Recipe> {
  const response = await apiClient.get<Recipe>(`${BASE}/${encodeURIComponent(id)}`);
  return response.data;
}

export async function createRecipe(dto: CreateRecipeRequest): Promise<Recipe> {
  const response = await apiClient.post<Recipe>(BASE, dto);
  return response.data;
}

export async function updateRecipe(id: string, dto: UpdateRecipeRequest): Promise<Recipe> {
  const response = await apiClient.patch<Recipe>(`${BASE}/${encodeURIComponent(id)}`, dto);
  return response.data;
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiClient.delete<void>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function startRecipeRun(recipeId: string, dto: StartRunRequest): Promise<RecipeRun> {
  const response = await apiClient.post<RecipeRun>(
    `${BASE}/${encodeURIComponent(recipeId)}/runs`,
    dto,
  );
  return response.data;
}

export async function listRecipeRuns(
  recipeId: string,
  query?: ListRunsQuery,
): Promise<PaginatedRecipeRuns> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {params.set('page', String(query.page));}
  if (query?.pageSize !== undefined) {params.set('pageSize', String(query.pageSize));}
  const qs = params.toString();
  const url =
    qs.length > 0
      ? `${BASE}/${encodeURIComponent(recipeId)}/runs?${qs}`
      : `${BASE}/${encodeURIComponent(recipeId)}/runs`;
  const response = await apiClient.get<PaginatedRecipeRuns>(url);
  return response.data;
}

export async function getRecipeRun(runId: string): Promise<RecipeRunDetail> {
  const response = await apiClient.get<RecipeRunDetail>(
    `${RUNS_BASE}/${encodeURIComponent(runId)}`,
  );
  return response.data;
}

export async function cancelRecipeRun(runId: string): Promise<RecipeRun> {
  const response = await apiClient.post<RecipeRun>(
    `${RUNS_BASE}/${encodeURIComponent(runId)}/cancel`,
    {},
  );
  return response.data;
}
