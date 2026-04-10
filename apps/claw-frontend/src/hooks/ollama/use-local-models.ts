import { useQuery } from "@tanstack/react-query";

import { ollamaRepository } from "@/repositories/ollama/ollama.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import { logger } from "@/utilities";

export function useLocalModels() {
  const query = useQuery({
    queryKey: queryKeys.localModels.lists(),
    queryFn: () => {
      logger.debug({ component: 'connectors', action: 'fetch-local-models', message: 'Fetching local Ollama models' });
      return ollamaRepository.getLocalModels();
    },
  });

  return {
    models: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
