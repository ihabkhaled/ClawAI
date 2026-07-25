import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import type { UseStartCheckoutReturn } from '@/types/billing-hook.types';
import { showToast } from '@/utilities/toast.utility';

// Starts a checkout and hands the browser to the gateway.
//
// The idempotency key is generated ONCE per attempt and reused if the mutation
// retries, so a double-click or a flaky network cannot create a second payable
// order for the same intent.
export function useStartCheckout(): UseStartCheckoutReturn {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { planId: string; billingInterval: string; gateway: string }) =>
      billingRepository.createCheckoutSession({
        ...input,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (session) => {
      setError(null);
      if (session.hostedCheckoutUrl !== null) {
        // Full navigation, not a router push: the gateway is a different origin.
        window.location.assign(session.hostedCheckoutUrl);
      }
    },
    onError: (mutationError: unknown) => {
      // Both a toast AND a persistent banner. A payment screen that fails
      // silently is a delivery blocker, and a toast alone is missable.
      const message = t('billing.checkout.startFailed');
      setError(message);
      showToast.apiError(mutationError, message);
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

  return { startCheckout, isPending: mutation.isPending, error, clearError };
}
