import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { modelCostRepository } from '@/repositories/admin/model-cost.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PublishModelCostRequest, UsePublishModelCostResult } from '@/types/model-cost.types';

/**
 * Publishes a new price version. The catalogue is invalidated on success
 * because publishing changes more than the edited row's rates: it flips
 * `pricingSource` away from PROVIDER_FALLBACK, which is the number the banner
 * counts.
 */
export function usePublishModelCost(onPublished: () => void): UsePublishModelCostResult {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (request: PublishModelCostRequest) => modelCostRepository.publish(request),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.adminModelCosts.all });
      onPublished();
    },
  });

  const publish = useCallback(
    (request: PublishModelCostRequest): void => {
      mutation.mutate(request);
    },
    [mutation],
  );

  const reset = useCallback((): void => {
    mutation.reset();
  }, [mutation]);

  return {
    publish,
    isPending: mutation.isPending,
    error: (mutation.error as Error | null) ?? null,
    reset,
  };
}
