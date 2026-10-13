import { useCallback } from 'react';

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/constants/pagination.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useUrlSearchDraft } from '@/hooks/observability/use-url-search-draft';
import type { SortOrder } from '@/types/observability-explorer.types';
import type { UseUrlListControlsReturn } from '@/types/observability-pages.types';
import { nextSort } from '@/utilities/observability-explorer.utility';
import { readPage, readPositiveInt, readSortOrder } from '@/utilities/observability-url.utility';

/**
 * Search, sort and page size for one table, kept in the URL (`q`, `sort`, `order`,
 * `limit`) so a link or a reload shows the same list. The search text is
 * debounced: the URL, and so the query, changes when typing pauses.
 */
export function useUrlListControls(
  defaultSort: string,
  defaultOrder: SortOrder = 'desc',
  allowedSorts?: readonly string[],
): UseUrlListControlsReturn {
  const scope = useObservabilityScope();
  const { param, setParams } = scope;
  const urlQuery = param('q');
  const writeSearch = useCallback(
    (next: string): void => {
      setParams({ q: next, page: null }, { keepPage: true });
    },
    [setParams],
  );
  const { draft: searchDraft, setDraft: setSearchDraft } = useUrlSearchDraft(urlQuery, writeSearch);

  const requestedSort = param('sort');
  const sort =
    requestedSort !== '' && (allowedSorts === undefined || allowedSorts.includes(requestedSort))
      ? requestedSort
      : defaultSort;
  const order = readSortOrder(param('order'), defaultOrder);
  const limit = readPositiveInt(param('limit'), DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS);
  const page = readPage(param('page'));

  return {
    searchDraft,
    search: urlQuery,
    sort,
    order,
    limit,
    page,
    setSearchDraft,
    toggleSort: (column: string): void => {
      const next = nextSort(sort, order, column);
      setParams({ sort: next.sort, order: next.order, page: null }, { keepPage: true });
    },
    setLimit: (next: number): void => {
      setParams({ limit: String(next), page: null }, { keepPage: true });
    },
    goToFirstPage: (): void => {
      setParams({ page: null }, { keepPage: true });
    },
    setPage: (next: number): void => {
      setParams({ page: next <= 1 ? null : String(next) }, { keepPage: true });
    },
  };
}
