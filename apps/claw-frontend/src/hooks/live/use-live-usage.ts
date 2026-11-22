import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_SESSION_MS } from '@/constants/query-policy.constants';
import { liveRepository } from '@/repositories/live/live.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseLiveUsageResult } from '@/types/live.types';

/** Free minutes left and the paid price. SESSION tier: it changes through the user's own viewing,
 * which invalidates it (modal close, credit approval) and the SSE `usage` event updates the modal. */
export function useLiveUsage(): UseLiveUsageResult {
  const query = useQuery({
    queryKey: queryKeys.live.usage(),
    queryFn: () => liveRepository.getUsage(),
    staleTime: QUERY_STALE_SESSION_MS,
  });
  return { usage: query.data ?? null, isLoading: query.isLoading, isError: query.isError };
}
