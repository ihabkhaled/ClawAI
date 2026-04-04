import { useQuery } from "@tanstack/react-query";

import { ollamaRepository } from "@/repositories/ollama/ollama.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useLocalModels() {
  const query = useQuery({
    queryKey: queryKeys.localModels.lists(),
    queryFn: () => ollamaRepository.getLocalModels(),
  });

  return {
    models: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
