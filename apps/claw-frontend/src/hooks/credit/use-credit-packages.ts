import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CREDIT_PACKAGES_STALE_MS } from '@/constants/credit.constants';
import { creditRepository } from '@/repositories/credit/credit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UseCreditPackagesReturn } from '@/types/credit-hook.types';
import { sortCreditPackages } from '@/utilities/credit.utility';

// The catalog only changes when an operator publishes a new immutable version,
// so it is cached generously rather than refetched on every mount.
//
// Read from auth-service (`/credit/packages`) rather than from payment-service:
// auth owns the package versions, and payment resolves the price from the same
// rows at checkout. One authority, one number.
export function useCreditPackages(): UseCreditPackagesReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useQuery({
    queryKey: queryKeys.credit.packages(),
    queryFn: () => creditRepository.listPackages(),
    enabled: isAuthenticated,
    staleTime: CREDIT_PACKAGES_STALE_MS,
  });

  const packages = useMemo(() => sortCreditPackages(query.data ?? []), [query.data]);

  return {
    packages,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
