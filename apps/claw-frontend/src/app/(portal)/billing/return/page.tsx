'use client';

import { Suspense } from 'react';

import { PaypalReturnView } from '@/components/billing/paypal-return-view';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useTranslation } from '@/lib/i18n';

export default function PaypalReturnPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<LoadingSpinner label={t('common.loading')} />}>
      <PaypalReturnView />
    </Suspense>
  );
}
