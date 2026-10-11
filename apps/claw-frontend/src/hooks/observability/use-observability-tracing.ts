import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  AUDIT_MAX_HOURS,
  TABLE_PAGE_SIZE,
  TRACING_SORTS,
} from '@/constants/observability-explorer.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { TracingDimension } from '@/enums/tracing-dimension.enum';
import { TracingSort } from '@/enums/tracing-sort.enum';
import { useListControls } from '@/hooks/observability/use-list-controls';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ObservabilityScope, TracingQuery } from '@/types/observability-explorer.types';

/** Latency, token source and failure signals per provider, model or context. */
export function useObservabilityTracing(scope: ObservabilityScope) {
  const controls = useListControls('requests', 'desc');
  const [dimension, setDimension] = useState<TracingDimension>(TracingDimension.Provider);
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const { hours, clamped } = scope.buildHours(AUDIT_MAX_HOURS);
  const contextKey = JSON.stringify([
    scope.selection,
    dimension,
    controls.search,
    controls.sort,
    controls.order,
  ]);
  const page = pageState.key === contextKey ? pageState.page : 1;
  const sort =
    TRACING_SORTS.find((candidate) => candidate === controls.sort) ?? TracingSort.Requests;

  const query: TracingQuery = {
    hours,
    dimension,
    search: controls.search,
    sort,
    order: controls.order,
    page,
    limit: TABLE_PAGE_SIZE,
  };

  const result = useQuery({
    queryKey: queryKeys.observabilityExplorer.tracing(query),
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    placeholderData: (previous) => previous,
    queryFn: () => observabilityExplorerRepository.getTracing(query),
  });

  return {
    controls,
    dimension,
    setDimension,
    page,
    setPage: (next: number): void => {
      setPageState({ key: contextKey, page: next });
    },
    clamped,
    data: result.data ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
