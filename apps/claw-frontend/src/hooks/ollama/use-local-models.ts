import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger } from '@/utilities';

export function useLocalModels() {
  const query = useQuery({
    queryKey: queryKeys.localModels.lists(),
    queryFn: () => {
      logger.debug({
        component: 'connectors',
        action: 'fetch-local-models',
        message: 'Fetching local Ollama models',
      });
      return ollamaRepository.getLocalModels();
    },
    // Ollama is an OPTIONAL local runtime. A deployment without it answers 502
    // on every call, so retrying cannot succeed -- it only keeps the dependent
    // pages in a loading state for the length of the backoff. Fail fast and let
    // callers degrade to cloud models.
    retry: false,
  });

  // `query.data?.data ?? []` looks harmless but returns a NEW array on every
  // render while the query has no data -- which is permanent when the service
  // is absent. That fresh identity invalidates every downstream useMemo and
  // useEffect dependency, and on the plan model-access page it drove a render
  // loop until React aborted with "Maximum update depth exceeded".
  // Memoising on `query.data?.data` keeps the empty case referentially stable,
  // because the dependency is a stable `undefined`.
  const models = useMemo(() => query.data?.data ?? [], [query.data?.data]);

  return {
    models,
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
