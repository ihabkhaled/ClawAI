import type { UseRecipeRunDetailPageReturn } from '../../types/recipe-page.types';

import { useCancelRecipeRun, useRecipeRun } from './use-recipes';

export function useRecipeRunDetailPage(runId: string | null): UseRecipeRunDetailPageReturn {
  const { data, isLoading, isError, error } = useRecipeRun(runId);
  const cancelMutation = useCancelRecipeRun();

  function handleCancel(): void {
    if (runId !== null) {cancelMutation.mutate(runId);}
  }

  return {
    run: data,
    isLoading,
    isError,
    error,
    handleCancel,
    isCancelling: cancelMutation.isPending,
  };
}
