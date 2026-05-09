import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelRecipeRun,
  createRecipe,
  deleteRecipe,
  getRecipe,
  getRecipeRun,
  listRecipeRuns,
  listRecipes,
  startRecipeRun,
  updateRecipe,
} from '../../repositories/agent/recipe.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type {
  CreateRecipeRequest,
  ListRecipesQuery,
  ListRunsQuery,
  StartRunRequest,
  UpdateRecipeRequest,
} from '../../types/recipe.types';

export function useRecipes(query?: ListRecipesQuery) {
  return useQuery({
    queryKey: queryKeys.agentRecipes.list(query ?? {}),
    queryFn: () => listRecipes(query),
  });
}

export function useRecipe(id: string | null) {
  return useQuery({
    queryKey: queryKeys.agentRecipes.detail(id ?? ''),
    queryFn: () => (id === null ? Promise.reject(new Error('id required')) : getRecipe(id)),
    enabled: id !== null,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateRecipeRequest) => createRecipe(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipes.lists() });
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRecipeRequest }) => updateRecipe(id, dto),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipes.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipes.detail(id) });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipes.lists() });
    },
  });
}

export function useStartRecipeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, dto }: { recipeId: string; dto: StartRunRequest }) =>
      startRecipeRun(recipeId, dto),
    onSuccess: (_data, { recipeId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipes.runs(recipeId) });
    },
  });
}

export function useRecipeRuns(recipeId: string | null, query?: ListRunsQuery) {
  return useQuery({
    queryKey: [...queryKeys.agentRecipes.runs(recipeId ?? ''), query ?? {}],
    queryFn: () =>
      recipeId === null ? Promise.reject(new Error('recipeId required')) : listRecipeRuns(recipeId, query),
    enabled: recipeId !== null,
  });
}

export function useRecipeRun(runId: string | null) {
  return useQuery({
    queryKey: queryKeys.agentRecipeRuns.detail(runId ?? ''),
    queryFn: () => (runId === null ? Promise.reject(new Error('runId required')) : getRecipeRun(runId)),
    enabled: runId !== null,
    refetchInterval: 3000,
  });
}

export function useCancelRecipeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => cancelRecipeRun(runId),
    onSuccess: (_data, runId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentRecipeRuns.detail(runId) });
    },
  });
}
