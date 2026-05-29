import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { authRepository } from '@/repositories/auth/auth.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UseEntitlementsResult } from '@/types';

export function useEntitlements(): UseEntitlementsResult {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useQuery({
    queryKey: queryKeys.myEntitlements.all,
    queryFn: () => authRepository.entitlements(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    entitlements: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    onRetry,
  };
}
