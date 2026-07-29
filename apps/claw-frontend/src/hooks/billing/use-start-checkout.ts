import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseStartCheckoutReturn } from '@/types/billing-hook.types';
import type { GatewayCheckoutSession } from '@/types/billing.types';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';
import { showToast } from '@/utilities/toast.utility';

// Starts a checkout and hands the browser to the gateway.
//
// The idempotency key is generated ONCE per attempt and reused if the mutation
// retries, so a double-click or a flaky network cannot create a second payable
// order for the same intent.
export function useStartCheckout(): UseStartCheckoutReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [gatewaySession, setGatewaySession] = useState<GatewayCheckoutSession | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { planId: string; billingInterval: string; gateway: string }) =>
      billingRepository.createCheckoutSession({
        ...input,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (session) => {
      setError(null);
      if (session.hostedCheckoutUrl !== null) {
        setGatewaySession(session);
      }
    },
    onError: (mutationError: unknown) => {
      // Both a toast AND a persistent banner. A payment screen that fails
      // silently is a delivery blocker, and a toast alone is missable.
      const message = resolveBillingErrorMessage(
        mutationError,
        t,
        t('billing.checkout.startFailed'),
      );
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
  });

  const startCheckout = useCallback(
    (input: { planId: string; billingInterval: string; gateway: string }) => {
      mutation.mutate(input);
    },
    [mutation],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeGateway = useCallback(() => {
    setGatewaySession(null);
  }, []);

  const completeGateway = useCallback(async () => {
    setGatewaySession(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    router.replace(ROUTES.BILLING);
    router.refresh();
  }, [queryClient, router]);

  return {
    startCheckout,
    isPending: mutation.isPending,
    error,
    clearError,
    gatewaySession,
    closeGateway,
    completeGateway,
  };
}
