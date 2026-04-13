import { useQuery } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useCompareRuns(runId1: string | null, runId2: string | null) {
  return useQuery({
    queryKey: queryKeys.replay.runs.compare(runId1 ?? '', runId2 ?? ''),
    queryFn: () => routingRepository.compareRuns(runId1!, runId2!),
    enabled: Boolean(runId1) && Boolean(runId2) && runId1 !== runId2,
  });
}
