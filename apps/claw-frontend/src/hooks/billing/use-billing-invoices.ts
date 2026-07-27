import { useMutation, useQuery } from '@tanstack/react-query';

import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseBillingInvoicesReturn } from '@/types/billing-hook.types';
import { saveBlobDownload } from '@/utilities/file-download.utility';

// Invoices are immutable once issued, so there is nothing to refetch eagerly.
export function useBillingInvoices(): UseBillingInvoicesReturn {
  const query = useQuery({
    queryKey: queryKeys.billing.invoices(),
    queryFn: () => billingRepository.listInvoices(),
  });
  const download = useMutation({
    mutationFn: (input: { id: string; number: string }) =>
      billingRepository.downloadInvoice(input.id),
    onSuccess: (blob, input) => {
      saveBlobDownload(blob, `${input.number}.pdf`);
    },
  });

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    download: (id, number) => {
      download.reset();
      download.mutate({ id, number });
    },
    pendingId: download.isPending ? (download.variables?.id ?? null) : null,
    isDownloadError: download.isError,
  };
}
