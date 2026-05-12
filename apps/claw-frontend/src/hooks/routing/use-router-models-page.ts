import { useCallback, useMemo, useState } from 'react';

import {
  ROUTER_MODELS_DEFAULT_FILTERS,
  ROUTER_MODELS_PAGE_SIZE,
} from '@/constants/router-models-page.constants';
import type { ListRouterModelsQuery, RouterModelsListMeta } from '@/types/router-models.types';
import type {
  RouterModelsPageFilters,
  UseRouterModelsPageResult,
} from '@/types/use-router-models-page.types';
import {
  mapLifecycleFilter,
  mapRouterOnlyFilter,
} from '@/utilities/router-models-filter-mapper.utility';

import { useRouterModelsList } from './use-router-models-list';

export function useRouterModelsPage(): UseRouterModelsPageResult {
  const [filters, setFilters] = useState<RouterModelsPageFilters>({
    ...ROUTER_MODELS_DEFAULT_FILTERS,
  });

  const queryArgs = useMemo<ListRouterModelsQuery>(
    () => ({
      page: 1,
      limit: ROUTER_MODELS_PAGE_SIZE,
      search: filters.search.length > 0 ? filters.search : undefined,
      provider: filters.provider !== 'ALL' ? filters.provider : undefined,
      lifecycle: mapLifecycleFilter(filters.lifecycle),
      isRouterOnly: mapRouterOnlyFilter(filters.isRouterOnly),
    }),
    [filters],
  );

  const query = useRouterModelsList(queryArgs);

  const setFilter = useCallback(
    <K extends keyof RouterModelsPageFilters>(key: K, value: RouterModelsPageFilters[K]): void => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback((): void => {
    setFilters({ ...ROUTER_MODELS_DEFAULT_FILTERS });
  }, []);

  const meta: RouterModelsListMeta | null = query.data?.meta ?? null;

  return {
    models: query.data?.data ?? [],
    meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    filters,
    setFilter,
    resetFilters,
    queryArgs,
  };
}
