import type { ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { BillingErrorBannerProps } from '@/types/billing-component.types';

// A persistent, dismissable banner for a failed billing mutation.
//
// This exists alongside the toast on purpose: a toast that fires while the user
// is scrolled elsewhere is simply missed, and "did my payment fail?" is not a
// question the UI is allowed to leave unanswered.
export function BillingErrorBanner({
  message,
  onDismiss,
  t,
}: BillingErrorBannerProps): ReactElement {
  return (
    <Alert
      variant={AlertVariant.Error}
      title={t('billing.error.title')}
      description={message}
      action={
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          {t('billing.error.dismiss')}
        </Button>
      }
    />
  );
}
