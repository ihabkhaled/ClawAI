import type { ReactElement } from 'react';
import { Suspense } from 'react';

import { PaymobPaymentWindow } from '@/components/billing/paymob-payment-window';

export default function PaymentWindowPage(): ReactElement {
  return (
    <Suspense>
      <PaymobPaymentWindow />
    </Suspense>
  );
}
