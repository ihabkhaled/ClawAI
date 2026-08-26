import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceChainRepository } from '@/repositories/workspace/chain.repository';
import type { UseChainRunsReturn } from '@/types';

export function useChainRuns(chainId: string | null): UseChainRunsReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceChains.runs(chainId ?? ''),
    queryFn: () => workspaceChainRepository.listChainRuns(chainId as string),
    enabled: chainId !== null,
    staleTime: 5_000,
  });

  return {
    runs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
