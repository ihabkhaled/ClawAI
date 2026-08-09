import { Suspense } from 'react';

import { BillingCheckoutContent } from '@/components/billing/billing-checkout-content';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillingCheckoutPage(): React.ReactElement {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-64 w-full max-w-2xl" />}>
      <BillingCheckoutContent />
    </Suspense>
  );
}
