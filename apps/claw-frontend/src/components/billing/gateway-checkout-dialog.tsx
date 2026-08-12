'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CHECKOUT_CLOSED_POLL_MAX_ATTEMPTS,
  CHECKOUT_POLL_INTERVAL_MS,
  CHECKOUT_POLL_MAX_ATTEMPTS,
  PAYMOB_COMPLETION_MESSAGE_TYPE,
  PAYPAL_COMPLETION_MESSAGE_TYPE,
} from '@/constants/billing.constants';
import { BillingGateway } from '@/enums/billing.enum';
import { billingRepository } from '@/repositories/billing/billing.repository';
import type { GatewayCheckoutDialogProps } from '@/types/billing-component.types';
import { readPaypalOrderId, renderPaypalButtons } from '@/utilities/paypal-buttons.utility';

export function GatewayCheckoutDialog({
  session,
  gateways,
  onClose,
  onComplete,
  t,
}: GatewayCheckoutDialogProps): React.ReactElement {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPaymobPolling, setIsPaymobPolling] = useState(false);
  const [paypalReadySessionId, setPaypalReadySessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paypalElement, setPaypalElement] = useState<HTMLDivElement | null>(null);
  const completed = useRef(false);
  const paymobPopup = useRef<Window | null>(null);
  const paymobPollAttempts = useRef(0);
  const paymobClosedPollAttempts = useRef(0);

  useEffect(() => {
    completed.current = false;
    setIsVerifying(false);
    setIsPaymobPolling(false);
    setPaypalReadySessionId(null);
    setError(null);
    paymobPollAttempts.current = 0;
    paymobClosedPollAttempts.current = 0;
  }, [session]);

  useEffect(() => {
    if (!isPaymobPolling || session === null || session.gateway !== BillingGateway.PAYMOB) {
      return;
    }
    let active = true;
    let requestInFlight = false;
    const stopPolling = (): void => {
      setIsPaymobPolling(false);
      setIsVerifying(false);
    };
    const verify = async (): Promise<void> => {
      if (requestInFlight) {
        return;
      }
      requestInFlight = true;
      paymobPollAttempts.current += 1;
      const popupWasClosed = paymobPopup.current?.closed ?? false;
      paymobClosedPollAttempts.current = popupWasClosed ? paymobClosedPollAttempts.current + 1 : 0;
      if (popupWasClosed) {
        setIsVerifying(false);
      }
      try {
        const latest =
          'purpose' in session
            ? await billingRepository.getPaymentMethodSetupSession(session.id)
            : await billingRepository.getCheckoutSession(session.id);
        if (!active) {
          return;
        }
        if (latest.status === 'COMPLETED' && !completed.current) {
          completed.current = true;
          setIsPaymobPolling(false);
          paymobPopup.current?.close();
          await onComplete();
          return;
        }
        if (latest.status === 'FAILED' || latest.status === 'EXPIRED') {
          stopPolling();
          paymobPopup.current?.close();
          setError(t('billing.gatewayDialog.verifyFailed'));
          return;
        }
        if (
          paymobPollAttempts.current >= CHECKOUT_POLL_MAX_ATTEMPTS ||
          paymobClosedPollAttempts.current >= CHECKOUT_CLOSED_POLL_MAX_ATTEMPTS
        ) {
          stopPolling();
        }
      } catch {
        if (
          active &&
          (paymobPollAttempts.current >= CHECKOUT_POLL_MAX_ATTEMPTS ||
            paymobClosedPollAttempts.current >= CHECKOUT_CLOSED_POLL_MAX_ATTEMPTS)
        ) {
          stopPolling();
        }
      } finally {
        requestInFlight = false;
      }
    };
    void verify();
    const interval = window.setInterval(() => void verify(), CHECKOUT_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isPaymobPolling, onComplete, session, t]);

  useEffect(() => {
    if (
      session === null ||
      session.gateway !== BillingGateway.PAYPAL ||
      session.hostedCheckoutUrl === null ||
      !('chargeCurrency' in session) ||
      paypalElement === null
    ) {
      return;
    }
    const orderId = readPaypalOrderId(session.hostedCheckoutUrl);
    const paypalClientId = gateways.find(
      (gateway) => gateway.gateway === BillingGateway.PAYPAL,
    )?.publicIdentifier;
    if (orderId === null || paypalClientId === null || paypalClientId === undefined) {
      setError(t('billing.gatewayDialog.loadFailed'));
      return;
    }
    let active = true;
    let closeButtons: (() => void) | undefined;
    const completePaypal = async (providerOrderId: string): Promise<void> => {
      if (completed.current) {
        return;
      }
      completed.current = true;
      setIsVerifying(true);
      setError(null);
      try {
        await billingRepository.completePaypalSdkCheckout(session.id, { providerOrderId });
        await onComplete();
      } catch {
        completed.current = false;
        setIsVerifying(false);
        setError(t('billing.gatewayDialog.verifyFailed'));
      }
    };
    void renderPaypalButtons({
      container: paypalElement,
      clientId: paypalClientId,
      currency: session.chargeCurrency,
      createOrder: () => Promise.resolve(orderId),
      onApprove: (data) => completePaypal(data.orderID),
      onCancel: onClose,
      onError: () => {
        if (active) {
          setError(t('billing.gatewayDialog.loadFailed'));
        }
      },
    })
      .then((handle) => {
        closeButtons = handle.close;
        if (active) {
          setPaypalReadySessionId(session.id);
        }
      })
      .catch(() => {
        if (active) {
          setPaypalReadySessionId(session.id);
          setError(t('billing.gatewayDialog.loadFailed'));
        }
      });
    return () => {
      active = false;
      closeButtons?.();
    };
  }, [gateways, onClose, onComplete, paypalElement, session, t]);

  useEffect(() => {
    if (session === null) {
      return;
    }
    const receive = (event: MessageEvent<unknown>): void => {
      if (
        event.origin !== window.location.origin ||
        typeof event.data !== 'object' ||
        event.data === null
      ) {
        return;
      }
      const message = event.data as { type?: unknown; sessionId?: unknown };
      const expectedType =
        session.gateway === BillingGateway.PAYMOB
          ? PAYMOB_COMPLETION_MESSAGE_TYPE
          : PAYPAL_COMPLETION_MESSAGE_TYPE;
      if (message.type !== expectedType || message.sessionId !== session.id) {
        return;
      }
      if (session.gateway === BillingGateway.PAYMOB) {
        setIsPaymobPolling(true);
      } else {
        void onComplete();
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onComplete, session]);

  const openPaymob = (): void => {
    if (session === null) {
      return;
    }
    const url = new URL('/billing/payment-window', window.location.origin);
    url.searchParams.set('session', session.id);
    if ('purpose' in session) {
      url.searchParams.set('setup', 'true');
    }
    const popup = window.open(
      url.toString(),
      'claw-paymob-checkout',
      'popup,width=720,height=760,resizable=yes,scrollbars=yes',
    );
    if (popup === null) {
      setError(t('billing.gatewayDialog.popupBlocked'));
      return;
    }
    paymobPopup.current = popup;
    paymobPollAttempts.current = 0;
    paymobClosedPollAttempts.current = 0;
    setError(null);
    setIsVerifying(true);
    setIsPaymobPolling(true);
  };

  const isPaypalLoading =
    session?.gateway === BillingGateway.PAYPAL && paypalReadySessionId !== session.id;

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) {
          paymobPopup.current?.close();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('billing.gatewayDialog.title')}</DialogTitle>
          <DialogDescription>
            {session?.gateway === BillingGateway.PAYMOB
              ? t('billing.gatewayDialog.paymobDescription')
              : t('billing.gatewayDialog.paypalDescription')}
          </DialogDescription>
        </DialogHeader>

        {session?.gateway === BillingGateway.PAYMOB ? (
          <Button type="button" onClick={openPaymob}>
            {t('billing.gatewayDialog.openPaymob')}
          </Button>
        ) : (
          <div className="relative min-h-24 w-full rounded-xl bg-white p-3 [color-scheme:light]">
            {isPaypalLoading ? (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-white text-slate-700"
                role="status"
              >
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {t('billing.gatewayDialog.loadingPaypal')}
              </div>
            ) : null}
            <div
              ref={setPaypalElement}
              data-testid="paypal-buttons"
              aria-hidden={isPaypalLoading}
              className={`min-h-20 w-full ${
                isPaypalLoading ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
            />
          </div>
        )}

        {isVerifying ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('billing.gatewayDialog.verifying')}
          </div>
        ) : null}
        {error !== null ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
