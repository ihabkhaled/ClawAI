import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';
import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceChainRepository } from '@/repositories/workspace/chain.repository';
import type { UseChainRunsReturn } from '@/types';

export function useChainRuns(chainId: string | null): UseChainRunsReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceChains.runs(chainId ?? ''),
    // Chain run status advances server-side.
    refetchInterval: QUERY_POLL_LIVE_MS,
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
