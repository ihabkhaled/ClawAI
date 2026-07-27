import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { refundsRepository } from '@/repositories/admin/refunds.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CreateAdminRefundRequest, UseAdminRefundsPageResult } from '@/types';
import { showToast } from '@/utilities';

export function useAdminRefunds(): UseAdminRefundsPageResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const query = useQuery({
    queryKey: queryKeys.adminRefunds.refundableTransactions(),
    queryFn: () => refundsRepository.listRefundableTransactions(),
    staleTime: 15_000,
  });
  const mutation = useMutation({
    mutationFn: (input: CreateAdminRefundRequest) => refundsRepository.create(input),
    onMutate: (input) => {
      setPendingId(input.paymentTransactionId);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminRefunds.success') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRefunds.all });
    },
    onError: (error: Error) => {
      setMutationError(error);
      showToast.apiError(error, t('adminRefunds.failed'));
    },
    onSettled: () => setPendingId(null),
  });

  const requestRefund = useCallback(
    (input: CreateAdminRefundRequest): void => mutation.mutate(input),
    [mutation],
  );
  const clearMutationError = useCallback((): void => setMutationError(null), []);
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    pendingId,
    mutationError,
    requestRefund,
    clearMutationError,
    retry,
    t,
  };
}
