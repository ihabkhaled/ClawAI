import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UsePaymentMethodsReturn } from '@/types/billing-hook.types';
import { showToast } from '@/utilities/toast.utility';

export function usePaymentMethods(): UsePaymentMethodsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Per-row pending state, not a single page-wide boolean: one flag would
  // disable every row while a single card is being removed.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.billing.paymentMethods(),
    queryFn: () => billingRepository.listPaymentMethods(),
  });

  const mutation = useMutation({
    mutationFn: (id: string) => billingRepository.deletePaymentMethod(id),
    onMutate: (id: string) => {
      setPendingId(id);
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.paymentMethods() });
    },
    onError: (mutationError: unknown) => {
      const message = t('billing.paymentMethods.removeFailed');
      setError(message);
      showToast.apiError(mutationError, message);
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const remove = useCallback(
    (id: string) => {
      mutation.mutate(id);
    },
    [mutation],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    methods: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    remove,
    pendingId,
    error,
    clearError,
  };
}
