import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UsePlanChangeReturn } from '@/types/billing-hook.types';
import type { GatewayCheckoutSession, ProrationQuoteView } from '@/types/billing.types';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';
import { showToast } from '@/utilities/toast.utility';

// Two-step plan change: quote, then confirm.
//
// The split is deliberate and is not a UX nicety. The user is shown an exact
// prorated amount and confirms THAT number; the server consumes the quote by
// id. Re-deriving the amount at confirm time would let the price move between
// the two steps, and charging a number the user never saw is indefensible.
export function usePlanChange(): UsePlanChangeReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [quote, setQuote] = useState<ProrationQuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gatewaySession, setGatewaySession] = useState<GatewayCheckoutSession | null>(null);

  const quoteMutation = useMutation({
    mutationFn: (input: { targetPlanId: string; billingInterval: string }) =>
      billingRepository.quotePlanChange(input),
    onSuccess: (result) => {
      setError(null);
      setQuote(result);
    },
    onError: (mutationError: unknown) => {
      const message = resolveBillingErrorMessage(
        mutationError,
        t,
        t('billing.planChange.quoteFailed'),
      );
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (gateway: string) => {
      if (quote === null) {
        throw new Error('no quote to confirm');
      }
      return billingRepository.confirmPlanChange({
        quoteId: quote.quoteId,
        gateway,
        idempotencyKey: crypto.randomUUID(),
      });
    },
    onSuccess: async (session) => {
      setError(null);
      // A downgrade or a zero-amount upgrade has no gateway step: it takes
      // effect directly, so there is nothing to redirect to.
      if (session?.hostedCheckoutUrl !== null && session?.hostedCheckoutUrl !== undefined) {
        setGatewaySession(session);
        return;
      }
      setQuote(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
      showToast.success({ description: t('billing.planChange.scheduled') });
    },
    onError: (mutationError: unknown) => {
      const message = resolveBillingErrorMessage(
        mutationError,
        t,
        t('billing.planChange.confirmFailed'),
      );
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
  });

  const requestQuote = useCallback(
    (input: { targetPlanId: string; billingInterval: string }) => {
      quoteMutation.mutate(input);
    },
    [quoteMutation],
  );

  const confirmChange = useCallback(
    (gateway: string) => {
      confirmMutation.mutate(gateway);
    },
    [confirmMutation],
  );

  const reset = useCallback(() => {
    setQuote(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeGateway = useCallback(() => {
    setGatewaySession(null);
  }, []);

  const completeGateway = useCallback(async () => {
    setGatewaySession(null);
    setQuote(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    router.replace(ROUTES.BILLING);
    router.refresh();
  }, [queryClient, router]);

  return {
    quote,
    requestQuote,
    confirmChange,
    isQuoting: quoteMutation.isPending,
    isConfirming: confirmMutation.isPending,
    error,
    clearError,
    reset,
    gatewaySession,
    closeGateway,
    completeGateway,
  };
}
