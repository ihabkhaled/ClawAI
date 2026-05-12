import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { updateRouterModel } from '@/repositories/routing/router-models.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RouterModel, UpdateRouterModelMutationVars } from '@/types/router-models.types';
import type { UseUpdateRouterModelResult } from '@/types/use-update-router-model.types';
import { showToast } from '@/utilities';

export function useUpdateRouterModel(): UseUpdateRouterModelResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const mutation = useMutation<RouterModel, Error, UpdateRouterModelMutationVars>({
    mutationFn: ({ id, payload }) => updateRouterModel(id, payload),
    onMutate: ({ id }) => {
      setPendingId(id);
      setMutationError(null);
    },
    onSuccess: (result) => {
      showToast.success({ description: t('routing.models.updateSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routerModels.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routerModels.detail(result.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routerModels.overrides(result.id) });
    },
    onError: (err) => {
      setMutationError(err);
      showToast.apiError(err, t('routing.models.updateFailed'));
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  return {
    mutation,
    pendingId,
    mutationError,
    reset: () => setMutationError(null),
  };
}
