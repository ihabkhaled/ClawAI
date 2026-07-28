'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/constants';
import { BillingReturnPhase } from '@/enums/billing.enum';
import { usePaypalReturn } from '@/hooks/billing/use-paypal-return';
import { useTranslation } from '@/lib/i18n';

export function PaypalReturnView(): React.ReactElement {
  const { t } = useTranslation();
  const { phase } = usePaypalReturn();

  if (phase === BillingReturnPhase.ERROR) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
        <AlertCircle className="text-destructive size-10" aria-hidden="true" />
        <h1 className="text-xl font-semibold">{t('billing.error.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('billing.checkout.startFailed')}</p>
        <Link className="text-primary text-sm font-medium underline" href={ROUTES.BILLING}>
          {t('billing.page.title')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
      <Loader2 className="text-primary size-10 animate-spin" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{t('billing.banner.incompleteTitle')}</h1>
      <p className="text-muted-foreground text-sm">{t('billing.banner.incompleteDescription')}</p>
    </main>
  );
}
