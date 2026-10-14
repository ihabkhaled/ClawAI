import { useQuery } from '@tanstack/react-query';

import { THREAD_RECOMMENDED_TEAM_STALE_MS } from '@/constants/thread-recommended-team.constants';
import { threadRecommendedTeamRepository } from '@/repositories/threads/thread-recommended-team.repository';
import type { ThreadRecommendedTeamResponse } from '@/types/thread-recommended-team.types';

/**
 * The server-owned recommended team. The server caches it for a minute, so the browser reuses it
 * for the same time. A failed read is not an error the owner sees: the wizard falls back to its
 * own ranking and the start preflight still decides.
 */
export function useThreadRecommendedTeam(): {
  recommendation: ThreadRecommendedTeamResponse | undefined;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['thread-publications', 'recommended-team'],
    queryFn: () => threadRecommendedTeamRepository.get(),
    staleTime: THREAD_RECOMMENDED_TEAM_STALE_MS,
    retry: 1,
  });
  return { recommendation: query.data, isLoading: query.isLoading };
}
