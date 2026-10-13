import { useQuery } from '@tanstack/react-query';

import { AUDIT_MAX_HOURS } from '@/constants/observability-explorer.constants';
import { AUDIT_LOOKUP_LIMIT } from '@/constants/observability-pages.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { TracingDimension } from '@/enums/tracing-dimension.enum';
import { TracingSort } from '@/enums/tracing-sort.enum';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { TracingQuery, TracingRow } from '@/types/observability-explorer.types';
import { isTracingRowOf } from '@/utilities/observability-pages.utility';

/**
 * Real latency and failure signals for one provider or model, from the audit
 * service (auth-service has no latency column). Capped at 30 days there, so a
 * longer period reports `clamped`. A row counts only when it IS that provider,
 * or that model of that provider: another entity's latency is never shown.
 */
export function useEntityAuditLatency(provider: string, model: string | null) {
  const { scope, issue } = useObservabilityScope();
  const { hours, clamped } = scope.buildHours(AUDIT_MAX_HOURS);
  const query: TracingQuery = {
    hours,
    dimension: model === null ? TracingDimension.Provider : TracingDimension.Model,
    search: model ?? provider,
    sort: TracingSort.Requests,
    order: 'desc',
    page: 1,
    limit: AUDIT_LOOKUP_LIMIT,
  };

  const result = useQuery({
    queryKey: queryKeys.observabilityExplorer.tracing(query),
    enabled: issue === null && provider !== '',
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getTracing(query),
  });

  const rows = result.data?.rows.items ?? [];
  const match: TracingRow | null = rows.find((row) => isTracingRowOf(row, provider, model)) ?? null;

  return {
    match,
    overall: result.data?.overall ?? null,
    clamped,
    isLoading: result.isLoading,
    isError: result.isError,
  };
}
