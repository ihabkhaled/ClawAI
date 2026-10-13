import { useMemo } from 'react';

import { useUrlSearchDraft } from '@/hooks/observability/use-url-search-draft';
import { useTranslation } from '@/lib/i18n';
import type { UsePluginsPageReturn } from '@/types/plugins.types';

import { usePluginCatalog } from './use-plugin-catalog';
import { usePluginsUrl } from './use-plugins-url';

/** Everything the Discover page needs: URL filters, the typing draft, and the cursor-paged list. */
export function usePluginsPage(): UsePluginsPageReturn {
  const { t } = useTranslation();
  const { filters, setQuery, setCategory, clearFilters } = usePluginsUrl();
  const { draft, setDraft } = useUrlSearchDraft(filters.q, setQuery);
  const query = usePluginCatalog(filters);

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return {
    t,
    filters,
    searchDraft: draft,
    setSearchDraft: setDraft,
    setCategory,
    clearFilters: () => {
      setDraft('');
      clearFilters();
    },
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    loadMore: () => {
      void query.fetchNextPage();
    },
    retry: () => {
      void query.refetch();
    },
  };
}
