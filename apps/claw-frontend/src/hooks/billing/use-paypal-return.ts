import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import {
  PAYMOB_COMPLETION_MESSAGE_TYPE,
  PAYPAL_COMPLETION_MESSAGE_TYPE,
  PAYPAL_STATE_PATTERN,
} from '@/constants/billing.constants';
import { BillingGateway, BillingReturnPhase } from '@/enums/billing.enum';
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
    const gateway = params.get('gateway');
    const state = params.get('state');
    const providerOrderId = params.get('token');
    window.history.replaceState(null, '', window.location.pathname);

    if (sessionId === null || sessionId.length === 0 || sessionId.length > 64) {
      setPhase(BillingReturnPhase.ERROR);
      return;
    }

    const isPaymob = gateway === BillingGateway.PAYMOB;
    if (
      !isPaymob &&
      (state === null ||
        !PAYPAL_STATE_PATTERN.test(state) ||
        providerOrderId === null ||
        providerOrderId.length === 0 ||
        providerOrderId.length > 64)
    ) {
      setPhase(BillingReturnPhase.ERROR);
      return;
    }

    const completion = isPaymob
      ? billingRepository.completePaymobCheckout(sessionId)
      : billingRepository.completePaypalCheckout(sessionId, {
          providerOrderId: providerOrderId ?? '',
          state: state ?? '',
        });
    completion
      .then(() => {
        setPhase(BillingReturnPhase.SUCCESS);
        const message = {
          type: isPaymob ? PAYMOB_COMPLETION_MESSAGE_TYPE : PAYPAL_COMPLETION_MESSAGE_TYPE,
          sessionId,
        };
        if (window.opener !== null && window.opener !== undefined && !window.opener.closed) {
          window.opener.postMessage(message, window.location.origin);
          window.close();
          return;
        }
        if (window.parent !== window) {
          window.parent.postMessage(message, window.location.origin);
          return;
        }
        router.replace(ROUTES.BILLING);
      })
      .catch(() => {
        setPhase(BillingReturnPhase.ERROR);
      });
  }, [params, router]);

  return { phase };
}
