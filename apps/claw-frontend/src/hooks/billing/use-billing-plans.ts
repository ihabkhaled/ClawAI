import { useQuery } from '@tanstack/react-query';

import { BILLING_PLANS_STALE_MS } from '@/constants/billing.constants';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseBillingPlansReturn } from '@/types/billing-hook.types';

// The plan catalog changes only when an administrator publishes a new price
// version, so it is cached generously rather than refetched on every mount.
export function useBillingPlans(): UseBillingPlansReturn {
  const query = useQuery({
    queryKey: queryKeys.billing.plans(),
    queryFn: () => billingRepository.listPlans(),
    staleTime: BILLING_PLANS_STALE_MS,
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
