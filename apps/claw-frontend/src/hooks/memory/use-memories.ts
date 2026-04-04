import { useQuery } from "@tanstack/react-query";

import { memoryRepository } from "@/repositories/memory/memory.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useMemories(filters: Record<string, unknown> = {}) {
  const params: Record<string, string> = {};
  if (filters["type"] !== undefined) {
    params["type"] = String(filters["type"]);
  }
  if (filters["isEnabled"] !== undefined) {
    params["isEnabled"] = String(filters["isEnabled"]);
  }

  const query = useQuery({
    queryKey: queryKeys.memory.list(filters),
    queryFn: () => memoryRepository.getMemories(params),
  });

  return {
    memories: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
