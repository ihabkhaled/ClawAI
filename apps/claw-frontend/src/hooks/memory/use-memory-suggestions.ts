import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';
import { memoryRepository } from '@/repositories/memory/memory.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MemorySuggestion } from '@/types';

export function useMemorySuggestions(filters: Record<string, unknown> = {}) {
  const params: Record<string, string> = {};
  if (filters['status'] !== undefined && filters['status'] !== '') {
    params['status'] = String(filters['status']);
  }
  if (filters['limit'] !== undefined) {
    params['limit'] = String(filters['limit']);
  }
  const query = useQuery<MemorySuggestion[]>({
    queryKey: queryKeys.memory.suggestions(filters),
    // Suggestions are generated server-side.
    refetchInterval: QUERY_POLL_LIVE_SLOW_MS,
    queryFn: () => memoryRepository.listSuggestions(params),
  });
  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
