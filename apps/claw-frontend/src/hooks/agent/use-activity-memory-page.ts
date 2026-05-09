import { useQuery } from '@tanstack/react-query';

import { listActivityEntries } from '../../repositories/agent/activity-memory.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { UseActivityMemoryPageReturn } from '../../types/activity-memory.types';

export function useActivityMemoryPage(): UseActivityMemoryPageReturn {
  const filter = { page: 1, pageSize: 100 };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.agentActivityMemory.list(filter),
    queryFn: () => listActivityEntries(filter),
  });

  return {
    entries: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
  };
}
