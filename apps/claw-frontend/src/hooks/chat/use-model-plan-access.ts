import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { MODEL_ACCESS_STALE_MS } from '@/constants/model-picker.constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ConnectorModel } from '@/types';
import { hashModelCatalogue } from '@/utilities/model-plan-access.utility';

// Which cloud models the signed-in user's plan lets them pick, so the pickers can dim the rest.
//
// The answer comes from the server, which decides it with the same function the send path uses:
// the browser cannot repeat it (a model's cost class depends on name normalisation and price
// fallbacks that live in routing-service). Local models are not asked about — they cost nothing and
// no plan excludes them. A failed lookup locks nothing: the send path still refuses, and a picker
// that dims every model because one request failed would be worse than one that does not dim.
export function useModelPlanAccess(models: readonly ConnectorModel[]): {
  isLocked: (provider: string, model: string) => boolean;
} {
  const pairs = useMemo(
    () => models.map((model) => ({ provider: model.provider, model: model.modelKey })),
    [models],
  );
  const catalogueKey = useMemo(() => hashModelCatalogue(pairs), [pairs]);

  const { data } = useQuery({
    queryKey: queryKeys.chat.modelAccess(catalogueKey),
    queryFn: () => chatRepository.getModelAccess(pairs),
    enabled: pairs.length > 0,
    staleTime: MODEL_ACCESS_STALE_MS,
  });

  const lockedKeys = useMemo(
    () =>
      new Set(
        (data ?? [])
          .filter((entry) => !entry.allowed)
          .map((entry) => `${entry.provider}/${entry.model}`),
      ),
    [data],
  );

  const isLocked = useCallback(
    (provider: string, model: string): boolean => lockedKeys.has(`${provider}/${model}`),
    [lockedKeys],
  );
  return { isLocked };
}
