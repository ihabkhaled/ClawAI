import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { PluginCatalogFilters } from '@/types/plugins.types';
import { parsePluginFilters, withPluginFilters } from '@/utilities/plugins.utility';

/**
 * The Discover search text and category, kept in the URL so a link, a reload and
 * the Back button land on the same view. Writes use `replace`: a filter tweak is
 * not a navigation step.
 */
export function usePluginsUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const paramsKey = params.toString();

  const filters = useMemo(() => parsePluginFilters(new URLSearchParams(paramsKey)), [paramsKey]);

  const update = useCallback(
    (updates: Partial<PluginCatalogFilters>): void => {
      const query = withPluginFilters(new URLSearchParams(paramsKey), updates);
      router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [paramsKey, pathname, router],
  );

  const setQuery = useCallback((q: string): void => update({ q }), [update]);
  const setCategory = useCallback((category: string): void => update({ category }), [update]);
  const clearFilters = useCallback((): void => update({ q: '', category: '' }), [update]);

  return { filters, setQuery, setCategory, clearFilters };
}
