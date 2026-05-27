import { useQuery } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RoutingDecisionDetail } from '@/types';

export function useRoutingDecisionDetail(
  decisionId: string | null,
  enabled: boolean,
): {
  decision: RoutingDecisionDetail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const query = useQuery<RoutingDecisionDetail>({
    queryKey: queryKeys.routing.decisions.detail(decisionId ?? 'none'),
    queryFn: () => routingRepository.getDecisionDetail(decisionId ?? ''),
    enabled: enabled && decisionId !== null && decisionId.length > 0,
    retry: false,
  });

  return {
    decision: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
