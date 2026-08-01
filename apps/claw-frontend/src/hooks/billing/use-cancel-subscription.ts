import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseCancelSubscriptionReturn } from '@/types/billing-hook.types';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';
import { invalidateUserPlanQueries } from '@/utilities/plan-cache.utility';
import { showToast } from '@/utilities/toast.utility';

// Schedule, undo, or immediately complete cancellation.
//
// Each successful response is written to the current-subscription cache before
// broad invalidation. The UI reacts immediately while the background refetch
// confirms payment-service truth.
export function useCancelSubscription(): UseCancelSubscriptionReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: () => billingRepository.cancel({ atPeriodEnd: true }),
    onSuccess: async (subscription) => {
      setError(null);
      queryClient.setQueryData(queryKeys.billing.current(), subscription);
      await invalidateUserPlanQueries(queryClient);
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
    onSuccess: async (subscription) => {
      setError(null);
      queryClient.setQueryData(queryKeys.billing.current(), subscription);
      await invalidateUserPlanQueries(queryClient);
      showToast.success({ description: t('billing.resume.done') });
    },
    onError: (mutationError: unknown) => {
      const message = resolveBillingErrorMessage(mutationError, t, t('billing.resume.failed'));
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
  });

  const endNowMutation = useMutation({
    mutationFn: () => billingRepository.endSubscriptionNow(),
    onSuccess: async () => {
      setError(null);
      queryClient.setQueryData(queryKeys.billing.current(), null);
      await invalidateUserPlanQueries(queryClient);
      showToast.success({ description: t('billing.remove.done') });
    },
    onError: (mutationError: unknown) => {
      const message = resolveBillingErrorMessage(mutationError, t, t('billing.remove.failed'));
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

  const endNow = useCallback(() => {
    endNowMutation.mutate();
  }, [endNowMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    cancel,
    resume,
    endNow,
    isCancelPending: cancelMutation.isPending,
    isResumePending: resumeMutation.isPending,
    isEndNowPending: endNowMutation.isPending,
    error,
    clearError,
  };
}
