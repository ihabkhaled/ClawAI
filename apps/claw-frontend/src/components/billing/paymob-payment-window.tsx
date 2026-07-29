'use client';

import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PAYMOB_COMPLETION_MESSAGE_TYPE } from '@/constants/billing.constants';
import { useTranslation } from '@/lib/i18n';
import { billingRepository } from '@/repositories/billing/billing.repository';
import type { GatewayCheckoutSession } from '@/types/billing.types';
import { loadPaymobPixel, readPaymobCredentials } from '@/utilities/paymob-pixel.utility';

export function PaymobPaymentWindow(): React.ReactElement {
  const params = useSearchParams();
  const { t } = useTranslation();
  const [session, setSession] = useState<GatewayCheckoutSession | null>(null);
  const [error, setError] = useState(false);
  const sessionId = params.get('session');
  const isSetup = params.get('setup') === 'true';
  const elementId = useMemo(() => `paymob-payment-window-${sessionId ?? 'missing'}`, [sessionId]);

  useEffect(() => {
    if (sessionId === null || sessionId.length === 0 || sessionId.length > 64) {
      setError(true);
      return;
    }
    const request: Promise<GatewayCheckoutSession> = isSetup
      ? billingRepository
          .getPaymentMethodSetupSession(sessionId)
          .then((result) => ({ ...result, purpose: 'PAYMENT_METHOD_SETUP' as const }))
      : billingRepository.getCheckoutSession(sessionId);
    void request
      .then((result) => {
        setSession(result);
      })
      .catch(() => setError(true));
  }, [isSetup, sessionId]);

  useEffect(() => {
    if (session === null || session.hostedCheckoutUrl === null) {
      return;
    }
    const credentials = readPaymobCredentials(session.hostedCheckoutUrl);
    if (credentials === null) {
      setError(true);
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
          afterPaymentComplete: () => {
            const message = { type: PAYMOB_COMPLETION_MESSAGE_TYPE, sessionId: session.id };
            if (window.opener !== null && !window.opener.closed) {
              window.opener.postMessage(message, window.location.origin);
            }
            window.close();
            return Promise.resolve();
          },
          onPaymentCancel: () => window.close(),
        });
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [elementId, isSetup, session]);

  return (
    <main className="bg-background flex min-h-screen flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{t('billing.gatewayDialog.title')}</h1>
      {session === null && !error ? (
        <div className="text-muted-foreground flex items-center gap-2" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('billing.gatewayDialog.verifying')}
        </div>
      ) : null}
      <div
        id={elementId}
        className="min-h-80 w-full overflow-y-auto rounded-xl bg-white p-3 text-slate-950 [color-scheme:light]"
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {t('billing.gatewayDialog.loadFailed')}
        </p>
      ) : null}
    </main>
  );
}
