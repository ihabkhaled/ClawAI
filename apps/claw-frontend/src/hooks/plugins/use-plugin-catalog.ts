import { useInfiniteQuery } from '@tanstack/react-query';

import { PLUGINS_PAGE_SIZE } from '@/constants/plugins.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginsRepository } from '@/repositories/plugins/plugins.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PluginCatalogFilters } from '@/types/plugins.types';

/** Cursor-paged Discover list. An empty filter is not sent, so the server returns everything. */
export function usePluginCatalog(filters: PluginCatalogFilters) {
  const { locale } = useTranslation();
  return useInfiniteQuery({
    queryKey: queryKeys.plugins.catalog(filters, locale),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      pluginsRepository.listCatalog({
        locale,
        q: filters.q.length > 0 ? filters.q : undefined,
        category: filters.category.length > 0 ? filters.category : undefined,
        cursor: pageParam,
        limit: PLUGINS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
