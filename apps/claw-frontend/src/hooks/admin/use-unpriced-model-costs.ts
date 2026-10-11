import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import {
  UNPRICED_MODELS_PAGE_SIZE,
  UNPRICED_SEARCH_DEBOUNCE_MS,
} from '@/constants/model-cost.constants';
import { useDebounce } from '@/hooks/common/use-debounce';
import { modelCostRepository } from '@/repositories/admin/model-cost.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseUnpricedModelCostsResult } from '@/types/model-cost.types';
import { countUnpricedPages } from '@/utilities/model-cost-unpriced.utility';

/**
 * Exposed models that still need a real price, searchable and server-paginated.
 *
 * The search term is debounced before it reaches the query key, and typing
 * returns to page 1 because page 4 of the old term means nothing under the new
 * one. The previous page stays on screen while the next loads, so the table
 * does not flash a skeleton on every keystroke.
 */
export function useUnpricedModelCosts(): UseUnpricedModelCostsResult {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), UNPRICED_SEARCH_DEBOUNCE_MS);

  const query = useQuery({
    queryKey: queryKeys.adminModelCosts.unpriced(page, UNPRICED_MODELS_PAGE_SIZE, debouncedSearch),
    queryFn: () =>
      modelCostRepository.listUnpriced({
        page,
        pageSize: UNPRICED_MODELS_PAGE_SIZE,
        search: debouncedSearch,
      }),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = countUnpricedPages(total, UNPRICED_MODELS_PAGE_SIZE);

  // Pricing the last row of the last page shrinks the list under the cursor.
  useEffect(() => {
    if (query.data !== undefined && page > totalPages) {
      setPage(totalPages);
    }
  }, [query.data, page, totalPages]);

  const onSearchChange = useCallback((value: string): void => {
    setSearch(value);
    setPage(1);
  }, []);

  const onPreviousPage = useCallback((): void => {
    setPage((current) => Math.max(1, current - 1));
  }, []);

  const onNextPage = useCallback((): void => {
    setPage((current) => Math.min(totalPages, current + 1));
  }, [totalPages]);

  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    rows: query.data?.items ?? [],
    total,
    page,
    totalPages,
    search,
    onSearchChange,
    onPreviousPage,
    onNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    onRetry,
  };
}
