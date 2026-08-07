'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { POLL_INTERVAL_MS } from '@/constants/local-frontier.constants';
import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { LoadedModel } from '@/types/local-frontier.types';

export function useLoadedModel(): UseQueryResult<LoadedModel | null, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.loadedModel(),
    queryFn: () => localFrontierRepository.getLoadedModel(),
    // llama.cpp is an OPTIONAL local runtime. Where it is not deployed every
    // call answers 502, so polling on forever is a permanent request flood
    // against an endpoint that cannot recover on its own. Stop once the query
    // has settled into an error; a user action or navigation refetches it.
    refetchInterval: (query) => (query.state.status === 'error' ? false : POLL_INTERVAL_MS * 5),
    retry: false,
  });
}
