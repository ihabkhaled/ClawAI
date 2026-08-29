import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { creditRepository } from '@/repositories/credit/credit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { GatewayCheckoutSession } from '@/types/billing.types';
import type { UseCreditTopupReturn } from '@/types/credit-hook.types';
import type { CreditTopupRequest, CreditTopupStartInput } from '@/types/credit.types';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';
import { showToast } from '@/utilities/toast.utility';

// Buys credit and hands the browser to the gateway.
//
// The idempotency key is generated ONCE per attempt and reused if the mutation
// retries, so a double-click or a flaky network cannot create a second payable
// order for the same intent — the same guarantee a plan checkout gets.
//
// The session that comes back is structurally a CheckoutSessionView, which is
// why the existing GatewayCheckoutDialog drives it unchanged. Forking that
// dialog for top-ups would fork the PayPal and Paymob verification logic with it.
export function useCreditTopup(): UseCreditTopupReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [gatewaySession, setGatewaySession] = useState<GatewayCheckoutSession | null>(null);
  const inFlightRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (input: CreditTopupRequest) => creditRepository.createTopupSession(input),
    onSuccess: (session) => {
      setError(null);
      if (session.hostedCheckoutUrl !== null) {
        setGatewaySession(session);
      }
    },
    onError: (mutationError: unknown) => {
      // Both a toast AND a persistent banner. A payment screen that fails
      // silently is a delivery blocker, and a toast alone is missable.
      const message = resolveBillingErrorMessage(mutationError, t, t('toast.creditTopupFailed'));
      setError(message);
      showToast.error({ title: t('billing.error.title'), description: message });
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  const startTopup = useCallback(
    (input: CreditTopupStartInput) => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      mutation.mutate({ ...input, idempotencyKey: crypto.randomUUID() });
    },
    [mutation],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeGateway = useCallback(() => {
    setGatewaySession(null);
    showToast.info({ title: t('toast.creditTopupCancelled') });
  }, [t]);

  // The webhook credits the wallet, not this callback. Invalidating both the
  // wallet and the ledger is what makes the new balance appear; announcing
  // success before the server confirmed it would be a lie the user can check.
  const completeGateway = useCallback(async () => {
    setGatewaySession(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.credit.all });
    showToast.success({ title: t('toast.creditTopupSucceeded') });
  }, [queryClient, t]);

  return {
    startTopup,
    isPending: mutation.isPending,
    error,
    clearError,
    gatewaySession,
    closeGateway,
    completeGateway,
  };
}
