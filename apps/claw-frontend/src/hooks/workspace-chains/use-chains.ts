import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceChainRepository } from '@/repositories/workspace/chain.repository';
import type { UseChainsReturn } from '@/types';

export function useChains(): UseChainsReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceChains.all,
    queryFn: () => workspaceChainRepository.listChains(),
    staleTime: 10_000,
  });

  return {
    chains: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
