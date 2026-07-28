import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants';

export default function CancelledBillingCheckoutPage(): never {
  redirect(ROUTES.BILLING);
}
