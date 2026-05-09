import type { UseRecipesPageReturn } from '../../types/recipe-page.types';

import { useDeleteRecipe, useRecipes } from './use-recipes';

export function useRecipesPage(): UseRecipesPageReturn {
  const { data, isLoading, isError, error } = useRecipes({ page: 1, pageSize: 50 });
  const deleteMutation = useDeleteRecipe();

  function handleDelete(id: string): void {
    deleteMutation.mutate(id);
  }

  return {
    recipes: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  };
}
