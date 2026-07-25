import { useQuery } from '@tanstack/react-query';

import { BILLING_USAGE_STALE_MS } from '@/constants/billing.constants';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseBillingUsageReturn } from '@/types/billing-hook.types';

// Usage moves while the user watches (every message spends tokens), so it is
// refetched eagerly and on window focus.
export function useBillingUsage(): UseBillingUsageReturn {
  const query = useQuery({
    queryKey: queryKeys.billing.usage(),
    queryFn: () => billingRepository.getUsage(),
    staleTime: BILLING_USAGE_STALE_MS,
    refetchOnWindowFocus: true,
  });

  return {
    usage: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
