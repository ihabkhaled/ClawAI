import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger } from '@/utilities';

export function useObservabilityPage() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.usage.summary,
    // A dashboard: it drifts, but nobody is waiting on a particular row.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => {
      logger.debug({
        component: 'audit',
        action: 'fetch-observability',
        message: 'Fetching observability data',
      });
      return auditRepository.getUsageSummary();
    },
  });

  const costQuery = useQuery({
    queryKey: queryKeys.usage.cost,
    // A dashboard: it drifts, but nobody is waiting on a particular row.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => auditRepository.getCostSummary(),
  });

  const latencyQuery = useQuery({
    queryKey: queryKeys.usage.latency,
    // A dashboard: it drifts, but nobody is waiting on a particular row.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => auditRepository.getLatencySummary(),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.audits.stats,
    // A dashboard: it drifts, but nobody is waiting on a particular row.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () => auditRepository.getAuditStats(),
  });

  return {
    summary: summaryQuery.data ?? { byProvider: [], byModel: [], totalRequests: 0 },
    cost: costQuery.data ?? { totalTokens: 0, totalRequests: 0, estimatedCost: 0 },
    latency: latencyQuery.data ?? { avgLatency: 0, p50Latency: 0, p95Latency: 0, totalRequests: 0 },
    auditStats: statsQuery.data ?? { byAction: [], bySeverity: [], total: 0 },
    isLoading: summaryQuery.isLoading || costQuery.isLoading || latencyQuery.isLoading,
    isError: summaryQuery.isError || costQuery.isError || latencyQuery.isError,
  };
}
