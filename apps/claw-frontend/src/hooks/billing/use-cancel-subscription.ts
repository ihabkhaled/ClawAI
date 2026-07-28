import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseCancelSubscriptionReturn } from '@/types/billing-hook.types';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';
import { showToast } from '@/utilities/toast.utility';

// Cancel and resume.
//
// Cancelling always requests `atPeriodEnd: true` — the user keeps what they
// paid for until the period they already bought runs out. Immediate revocation
// would be a refund question, and that is an operator decision, not a
// self-service button.
export function useCancelSubscription(): UseCancelSubscriptionReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: () => billingRepository.cancel({ atPeriodEnd: true }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      showToast.success({ description: t('billing.cancel.scheduled') });
    },
    onError: (mutationError: unknown) => {
      const message = resolveBillingErrorMessage(mutationError, t, t('billing.cancel.failed'));
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => billingRepository.resume(),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      showToast.success({ description: t('billing.resume.done') });
    },
    onError: (mutationError: unknown) => {
      const message = resolveBillingErrorMessage(mutationError, t, t('billing.resume.failed'));
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
  });

  const cancel = useCallback(() => {
    cancelMutation.mutate();
  }, [cancelMutation]);

  const resume = useCallback(() => {
    resumeMutation.mutate();
  }, [resumeMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    cancel,
    resume,
    isCancelPending: cancelMutation.isPending,
    isResumePending: resumeMutation.isPending,
    error,
    clearError,
  };
}
