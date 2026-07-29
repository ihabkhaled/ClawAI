'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PAYMOB_COMPLETION_MESSAGE_TYPE,
  PAYPAL_COMPLETION_MESSAGE_TYPE,
} from '@/constants/billing.constants';
import { BillingGateway } from '@/enums/billing.enum';
import { billingRepository } from '@/repositories/billing/billing.repository';
import type { GatewayCheckoutDialogProps } from '@/types/billing-component.types';
import { loadPaymobPixel, readPaymobCredentials } from '@/utilities/paymob-pixel.utility';
import { readPaypalOrderId, renderPaypalButtons } from '@/utilities/paypal-buttons.utility';

export function GatewayCheckoutDialog({
  session,
  onClose,
  onComplete,
  t,
}: GatewayCheckoutDialogProps): React.ReactElement {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = useRef(false);
  const [paypalElement, setPaypalElement] = useState<HTMLDivElement | null>(null);
  const elementId = useMemo(() => `paymob-elements-${session?.id ?? 'closed'}`, [session?.id]);
  const isSetup = session !== null && 'purpose' in session;

  const completePaymob = useCallback(async () => {
    if (session === null || completed.current) {
      return;
    }
    completed.current = true;
    setIsVerifying(true);
    setError(null);
    try {
      await billingRepository.completePaymobCheckout(session.id);
      await onComplete();
    } catch {
      completed.current = false;
      setIsVerifying(false);
      setError(t('billing.gatewayDialog.verifyFailed'));
    }
  }, [onComplete, session, t]);

  useEffect(() => {
    completed.current = false;
    setIsVerifying(false);
    setError(null);
    if (
      session === null ||
      session.gateway !== BillingGateway.PAYMOB ||
      session.hostedCheckoutUrl === null
    ) {
      return;
    }
    const credentials = readPaymobCredentials(session.hostedCheckoutUrl);
    if (credentials === null) {
      setError(t('billing.gatewayDialog.loadFailed'));
      return;
    }
    let active = true;
    void loadPaymobPixel()
      .then(() => {
        if (!active || window.Pixel === undefined) {
          return;
        }
        new window.Pixel({
          ...credentials,
          paymentMethods: ['card'],
          elementId,
          disablePay: false,
          showSaveCard: isSetup,
          forceSaveCard: isSetup,
          afterPaymentComplete: completePaymob,
          onPaymentCancel: onClose,
        });
      })
      .catch(() => {
        if (active) {
          setError(t('billing.gatewayDialog.loadFailed'));
        }
      });
    return () => {
      active = false;
    };
  }, [completePaymob, elementId, isSetup, onClose, session, t]);

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
    if (orderId === null) {
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
      })
      .catch(() => {
        if (active) {
          setError(t('billing.gatewayDialog.loadFailed'));
        }
      });
    return () => {
      active = false;
      closeButtons?.();
    };
  }, [onClose, onComplete, paypalElement, session, t]);

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
      if (message.type === expectedType && message.sessionId === session.id) {
        void onComplete();
      }
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
    };
  }, [onComplete, session]);

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open && !isVerifying) {
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
          <div
            id={elementId}
            className="min-h-80 w-full overflow-y-auto rounded-xl bg-white p-3 [color-scheme:light]"
          />
        ) : (
          <div
            ref={setPaypalElement}
            className="min-h-24 w-full rounded-xl bg-white p-3 [color-scheme:light]"
          />
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
