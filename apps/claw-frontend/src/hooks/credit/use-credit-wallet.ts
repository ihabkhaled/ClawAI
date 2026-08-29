import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { CREDIT_WALLET_STALE_MS } from '@/constants/credit.constants';
import { creditRepository } from '@/repositories/credit/credit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UseCreditWalletReturn } from '@/types/credit-hook.types';

// The balance moves while the user watches — every metered message spends some
// of it — so it is refetched eagerly and on window focus, exactly like the token
// usage it sits beside. A stale balance on this screen is the difference between
// "you have $2 left" and a refusal two seconds later.
export function useCreditWallet(): UseCreditWalletReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useQuery({
    queryKey: queryKeys.credit.wallet(),
    queryFn: () => creditRepository.getWallet(),
    enabled: isAuthenticated,
    staleTime: CREDIT_WALLET_STALE_MS,
    refetchOnWindowFocus: true,
  });

  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    wallet: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    onRetry,
  };
}
