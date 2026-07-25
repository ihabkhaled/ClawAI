import { useQuery } from '@tanstack/react-query';

import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseBillingInvoicesReturn } from '@/types/billing-hook.types';

// Invoices are immutable once issued, so there is nothing to refetch eagerly.
export function useBillingInvoices(): UseBillingInvoicesReturn {
  const query = useQuery({
    queryKey: queryKeys.billing.invoices(),
    queryFn: () => billingRepository.listInvoices(),
  });

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
