import { useQuery } from '@tanstack/react-query';

import { BILLING_SUBSCRIPTION_STALE_MS } from '@/constants/billing.constants';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseCurrentSubscriptionReturn } from '@/types/billing-hook.types';

// A free user has no subscription. `null` is therefore a valid answer and NOT
// an error state — rendering an error for it would tell every free user that
// billing is broken.
export function useCurrentSubscription(): UseCurrentSubscriptionReturn {
  const query = useQuery({
    queryKey: queryKeys.billing.current(),
    queryFn: () => billingRepository.getCurrent(),
    staleTime: BILLING_SUBSCRIPTION_STALE_MS,
  });

  return {
    subscription: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
