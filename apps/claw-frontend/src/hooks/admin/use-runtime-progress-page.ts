import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import {
  getLlamacppProbeReport,
  getOllamaProbeReport,
} from '@/repositories/runtime-progress/runtime-progress.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseRuntimeProgressPageReturn } from '@/types';

// Controller hook for /admin/runtime-progress. Fires both probe queries in
// parallel, exposes one onRefreshAll that invalidates the namespace, and
// computes lastUpdatedAt = max(both dataUpdatedAt). Queries are gated on the
// caller being ADMIN so non-admin renders never trigger a 403.
export function useRuntimeProgressPage(): UseRuntimeProgressPageReturn {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === UserRole.ADMIN;

  const ollamaQuery = useQuery({
    queryKey: queryKeys.runtimeProgress.ollamaProbe(),
    queryFn: () => getOllamaProbeReport(),
    enabled: isAdmin,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const llamacppQuery = useQuery({
    queryKey: queryKeys.runtimeProgress.llamacppProbe(),
    queryFn: () => getLlamacppProbeReport(),
    enabled: isAdmin,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const onRefreshOllama = useCallback((): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.runtimeProgress.ollamaProbe(),
    });
  }, [queryClient]);

  const onRefreshLlamacpp = useCallback((): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.runtimeProgress.llamacppProbe(),
    });
  }, [queryClient]);

  const onRefreshAll = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.runtimeProgress.all });
  }, [queryClient]);

  const lastUpdatedAt = useMemo<number | null>(() => {
    const ollamaAt = ollamaQuery.dataUpdatedAt ?? 0;
    const llamacppAt = llamacppQuery.dataUpdatedAt ?? 0;
    const max = Math.max(ollamaAt, llamacppAt);
    return max > 0 ? max : null;
  }, [ollamaQuery.dataUpdatedAt, llamacppQuery.dataUpdatedAt]);

  const isRefreshing = ollamaQuery.isFetching || llamacppQuery.isFetching;

  return {
    t,
    user: user ?? null,
    isAdmin,
    ollama: {
      data: ollamaQuery.data,
      isLoading: ollamaQuery.isLoading,
      isError: ollamaQuery.isError,
      error: ollamaQuery.error instanceof Error ? ollamaQuery.error : null,
      onRefresh: onRefreshOllama,
    },
    llamacpp: {
      data: llamacppQuery.data,
      isLoading: llamacppQuery.isLoading,
      isError: llamacppQuery.isError,
      error: llamacppQuery.error instanceof Error ? llamacppQuery.error : null,
      onRefresh: onRefreshLlamacpp,
    },
    lastUpdatedAt,
    isRefreshing,
    onRefreshAll,
  };
}
