import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceChainRepository } from '@/repositories/workspace/chain.repository';
import type { UseChainTemplatesReturn } from '@/types';

export function useChainTemplates(): UseChainTemplatesReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceChainTemplates.all,
    queryFn: () => workspaceChainRepository.listTemplates(),
    staleTime: 60_000,
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
