import { useQuery } from '@tanstack/react-query';

import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseBillingGatewaysReturn } from '@/types/billing-hook.types';

export function useBillingGateways(): UseBillingGatewaysReturn {
  const query = useQuery({
    queryKey: queryKeys.billing.gateways(),
    queryFn: () => billingRepository.listGateways(),
    staleTime: 30_000,
  });
  return {
    gateways: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
