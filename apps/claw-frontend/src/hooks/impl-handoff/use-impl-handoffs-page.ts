import { useQuery } from '@tanstack/react-query';

import type { ImplHandoffStatus } from '@/enums/impl-handoff-status.enum';
import { queryKeys } from '@/repositories/shared/query-keys';
import { listImplHandoffs } from '@/repositories/workspace/impl-handoff.repository';
import type { HandoffPayload } from '@/types/impl-handoff.types';

export function useImplHandoffsPage(status?: ImplHandoffStatus): {
  handoffs: HandoffPayload[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const query = useQuery({
    queryKey: queryKeys.implHandoffs.list(status),
    queryFn: () => listImplHandoffs(status, 50),
    staleTime: 30_000,
  });
  return {
    handoffs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
