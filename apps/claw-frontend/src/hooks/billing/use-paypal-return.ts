import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import { PAYPAL_STATE_PATTERN } from '@/constants/billing.constants';
import { BillingReturnPhase } from '@/enums/billing.enum';
import { billingRepository } from '@/repositories/billing/billing.repository';
import type { UsePaypalReturnReturn } from '@/types/billing-hook.types';

export function usePaypalReturn(): UsePaypalReturnReturn {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<BillingReturnPhase>(BillingReturnPhase.COMPLETING);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const sessionId = params.get('session');
    const state = params.get('state');
    const providerOrderId = params.get('token');
    window.history.replaceState(null, '', window.location.pathname);

    if (
      sessionId === null ||
      sessionId.length === 0 ||
      sessionId.length > 64 ||
      state === null ||
      !PAYPAL_STATE_PATTERN.test(state) ||
      providerOrderId === null ||
      providerOrderId.length === 0 ||
      providerOrderId.length > 64
    ) {
      setPhase(BillingReturnPhase.ERROR);
      return;
    }

    billingRepository
      .completePaypalCheckout(sessionId, { providerOrderId, state })
      .then(() => {
        setPhase(BillingReturnPhase.SUCCESS);
        router.replace(ROUTES.BILLING);
      })
      .catch(() => {
        setPhase(BillingReturnPhase.ERROR);
      });
  }, [params, router]);

  return { phase };
}
