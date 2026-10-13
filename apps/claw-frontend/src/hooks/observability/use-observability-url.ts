import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  EMPTY_OBSERVABILITY_URL_STATE,
  FILTER_URL_KEYS,
} from '@/constants/observability-pages.constants';
import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import type { ObservabilityUrlState, UrlUpdates } from '@/types/observability-pages.types';
import {
  applyUpdates,
  buildScope,
  buildSharedQuery,
  parseUrlState,
  withQuery,
} from '@/utilities/observability-url.utility';
import { validateSelection } from '@/utilities/usage-analytics.utility';

/**
 * The Observability period and filters, kept in the URL so a link, a reload and
 * the browser Back button all land on the same view. Writes use `replace`: a
 * filter tweak is not a navigation step.
 */
export function useObservabilityUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const paramsKey = params.toString();

  const state = useMemo(() => parseUrlState(new URLSearchParams(paramsKey)), [paramsKey]);
  const scope = useMemo(() => buildScope(state, new Date()), [state]);
  const issue = useMemo(() => validateSelection(scope.selection), [scope]);
  const sharedQuery = useMemo(() => buildSharedQuery(new URLSearchParams(paramsKey)), [paramsKey]);

  const setParams = useCallback(
    (updates: UrlUpdates, options?: { keepPage?: boolean }): void => {
      const query = applyUpdates(
        new URLSearchParams(paramsKey),
        updates,
        options?.keepPage ?? false,
      );
      router.replace(withQuery(pathname, query), { scroll: false });
    },
    [paramsKey, pathname, router],
  );

  const setPeriod = useCallback(
    (period: ObservabilityPeriod): void => {
      setParams(
        period === ObservabilityPeriod.Custom ? { period } : { period, from: null, to: null },
      );
    },
    [setParams],
  );
  const setFilter = useCallback(
    (name: keyof ObservabilityUrlState, value: string): void => {
      setParams({ [name]: value });
    },
    [setParams],
  );
  const clearFilters = useCallback((): void => {
    setParams(Object.fromEntries(FILTER_URL_KEYS.map((key) => [key, null])));
  }, [setParams]);
  const openUser = useCallback(
    (userId: string): void => {
      setParams({ user: userId }, { keepPage: true });
    },
    [setParams],
  );
  const closeUser = useCallback((): void => {
    setParams({ user: null }, { keepPage: true });
  }, [setParams]);
  const param = useCallback(
    (name: string): string => new URLSearchParams(paramsKey).get(name) ?? '',
    [paramsKey],
  );

  return {
    state: { ...EMPTY_OBSERVABILITY_URL_STATE, ...state },
    scope,
    issue,
    sharedQuery,
    setParams,
    setPeriod,
    setFilter,
    clearFilters,
    openUser,
    closeUser,
    param,
  };
}
