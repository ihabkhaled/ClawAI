'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
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

export function GatewayCheckoutDialog({
  session,
  onClose,
  onComplete,
  t,
}: GatewayCheckoutDialogProps): React.ReactElement {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = useRef(false);
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

  const openPaypal = useCallback(() => {
    if (session?.hostedCheckoutUrl === null || session?.hostedCheckoutUrl === undefined) {
      return;
    }
    const popup = window.open(
      session.hostedCheckoutUrl,
      'claw-paypal-checkout',
      'popup,width=520,height=720,resizable=yes,scrollbars=yes',
    );
    if (popup === null) {
      setError(t('billing.gatewayDialog.popupBlocked'));
    }
  }, [session, t]);

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
          <div id={elementId} className="min-h-80 w-full overflow-y-auto" />
        ) : (
          <Button type="button" onClick={openPaypal}>
            {t('billing.gatewayDialog.openPaypal')}
          </Button>
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
