import { useQuery } from "@tanstack/react-query";

import { contextPacksRepository } from "@/repositories/context-packs/context-packs.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useContextPacks() {
  const query = useQuery({
    queryKey: queryKeys.contextPacks.lists(),
    queryFn: () => contextPacksRepository.getContextPacks(),
  });

  return {
    contextPacks: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
