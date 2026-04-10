import { useQuery } from "@tanstack/react-query";

import { contextPacksRepository } from "@/repositories/context-packs/context-packs.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import { logger } from "@/utilities";

export function useContextPacks() {
  const query = useQuery({
    queryKey: queryKeys.contextPacks.lists(),
    queryFn: () => {
      logger.debug({ component: 'memory', action: 'fetch-context-packs', message: 'Fetching context packs' });
      return contextPacksRepository.getContextPacks();
    },
  });

  return {
    contextPacks: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
